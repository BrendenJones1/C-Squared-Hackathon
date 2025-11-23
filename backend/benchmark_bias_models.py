#!/usr/bin/env python
"""
BiasLens MNLI Model Benchmarking Script

This script benchmarks three bias-detection setups for job postings:

  1) facebook/bart-large-mnli             (HF Transformers, fp32)
  2) MoritzLaurer/deberta-v3-base-mnli    (HF Transformers, fp32)
  3) INT8 ONNX-quantized DeBERTa-MNLI     (ONNX Runtime, CPU, dynamic int8)

Each model is evaluated on:
  - Binary bias detection accuracy (biased vs neutral)
  - International-student / visa / cultural bias recall
  - Average latency per sentence (ms), with warm models

The pipeline uses:
  - The existing BiasLens bias phrase lookup table FIRST
  - Then MNLI-based sentence classification for subtle bias NOT caught by the table

You ONLY need to:
  1) Install packages (see below)
  2) Fill in TEST_SENTENCES with your own labeled examples

Recommended test set size for a hackathon:
  - ~40–80 sentences total is plenty
  - Include at least:
      * ~20 clearly biased vs ~20 clearly neutral postings/sentences
      * 10–15 examples with international / visa / cultural bias
    Try to mix employers, industries, and wording styles.

How to run (from project root):
  - pip install torch transformers onnx onnxruntime onnxruntime-tools
  - (optional but recommended) pip install accelerate
  - python -m backend.benchmark_bias_models

Where to put your job postings:
  - Add short representative sentences or short paragraphs into TEST_SENTENCES below.
  - Each item should have:
        {
            "text": "Your job posting sentence here...",
            "label_bias": 1 or 0,              # 1 = biased, 0 = neutral
            "label_international_bias": 1 or 0 # 1 = intl/visa/cultural bias present
        }
  - You can derive these from full job postings by splitting them into sentences
    and labeling only the ones that clearly show bias or are neutral.
"""

import time
import random
from dataclasses import dataclass
from typing import List, Dict, Tuple, Any

import numpy as np
import torch
from transformers import AutoTokenizer, AutoModelForSequenceClassification

import onnx
import onnxruntime as ort
from onnxruntime.quantization import quantize_dynamic, QuantType
from pathlib import Path

# ---------------------------------------------------------------------------
# 1. Bias phrase lookup table: re-use BiasLens production dictionary
# ---------------------------------------------------------------------------

"""
We import the unified bias phrase dictionary from the existing backend.

If you ever rename or move this, update the import below.
"""
from backend.bias_engine import BIAS_PHRASES  # noqa: E402


def lookup_bias_flags(text: str) -> Tuple[bool, bool, List[str]]:
    """
    Simple phrase-level lookup using the shared BiasLens dictionary.

    Returns:
      has_any_bias         : True if ANY phrase from the table is found
      has_international    : True if any visa/international/cultural phrase is found
      matched_phrases      : List of phrases that matched
    """
    txt = text.lower()
    matched = []

    has_any_bias = False
    has_international = False

    for phrase, meta in BIAS_PHRASES.items():
        if phrase in txt:
            matched.append(phrase)
            has_any_bias = True
            cat = (meta.get("category") or "").lower()
            if any(
                kw in cat
                for kw in ["visa", "international", "culture", "cultural", "immigration"]
            ):
                has_international = True

    return has_any_bias, has_international, matched


# ---------------------------------------------------------------------------
# 2. Test data placeholder – YOU fill this in
# ---------------------------------------------------------------------------

"""
Fill in TEST_SENTENCES with your labeled examples.

Each item:
    {
        "text": "...",
        "label_bias": 0 or 1,              # 1 = biased, 0 = neutral
        "label_international_bias": 0 or 1 # 1 = visa/cultural/international bias present
    }

All labels are per-sentence (or short paragraph).

>>> IMPORTANT: For hackathon-level evaluation, aim for ~40–80 total examples
>>>            with at least 10–15 that clearly involve international/visa/cultural bias.
"""

TEST_SENTENCES = [
    {
        "text": "We are looking for a young and energetic rockstar engineer.",
        "label_bias": 2,
        "label_international_bias": 0,
    },
    {
        "text": "Native English speaker required for this client-facing role.",
        "label_bias": 1,
        "label_international_bias": 2,
    },
    {
        "text": "We welcome applicants from all backgrounds and identities.",
        "label_bias": 0,
        "label_international_bias": 0,
    },
    {
        "text": "Applicants must be able to work in a fast-paced, high-pressure environment.",
        "label_bias": 1,
        "label_international_bias": 0,
    },
    {
        "text": "Only U.S. citizens will be considered for this position.",
        "label_bias": 2,
        "label_international_bias": 2,
    },
    {
        "text": "We do not provide visa sponsorship at this time.",
        "label_bias": 1,
        "label_international_bias": 2,
    },
    {
        "text": "Looking for a digital native to join our marketing team.",
        "label_bias": 1,
        "label_international_bias": 0,
    },
    {
        "text": "Candidates should have no strong accent for customer calls.",
        "label_bias": 1,
        "label_international_bias": 2,
    },
    {
        "text": "We value diversity and encourage all qualified applicants to apply.",
        "label_bias": 0,
        "label_international_bias": 0,
    },
    {
        "text": "Ideal candidate is a recent graduate eager to learn.",
        "label_bias": 1,
        "label_international_bias": 0,
    },
    {
        "text": "Must have a valid driver's license and personal vehicle.",
        "label_bias": 1,
        "label_international_bias": 0,
    },
    {
        "text": "We do not hire international applicants for this role.",
        "label_bias": 2,
        "label_international_bias": 2,
    },
    {
        "text": "Join a fun, high-energy team where we work hard and play hard.",
        "label_bias": 1,
        "label_international_bias": 0,
    },
    {
        "text": "Strong communication skills required; native-level English preferred.",
        "label_bias": 1,
        "label_international_bias": 1,
    },
    {
        "text": "Candidates must lift 50 pounds regularly during shifts.",
        "label_bias": 1,
        "label_international_bias": 0,
    },
    {
        "text": "Young professionals encouraged to apply.",
        "label_bias": 1,
        "label_international_bias": 0,
    },
    {
        "text": "We expect employees to handle stress without complaining.",
        "label_bias": 2,
        "label_international_bias": 0,
    },
    {
        "text": "Applicants must currently reside in the U.S. only.",
        "label_bias": 1,
        "label_international_bias": 2,
    },
    {
        "text": "The team values empathy, collaboration, and supportive culture.",
        "label_bias": 0,
        "label_international_bias": 0,
    },
    {
        "text": "We prefer candidates who grew up in North America.",
        "label_bias": 2,
        "label_international_bias": 2,
    },
    {
        "text": "Looking for a highly competitive and aggressive salesperson.",
        "label_bias": 1,
        "label_international_bias": 0,
    },
    {
        "text": "Fluent English required; international applicants discouraged.",
        "label_bias": 2,
        "label_international_bias": 2,
    },
    {
        "text": "Workplace accommodates all disabilities and provides reasonable adjustments.",
        "label_bias": 0,
        "label_international_bias": 0,
    },
    {
        "text": "The ideal candidate is energetic, fun, and youthful.",
        "label_bias": 1,
        "label_international_bias": 0,
    },
    {
        "text": "Only local candidates will be considered.",
        "label_bias": 1,
        "label_international_bias": 1,
    },
    {
        "text": "Visa sponsorship may be available for exceptional talent.",
        "label_bias": 0,
        "label_international_bias": 1,
    },
    {
        "text": "Applicants must be US-born for security reasons.",
        "label_bias": 2,
        "label_international_bias": 2,
    },
    {
        "text": "We support global hiring and value international experience.",
        "label_bias": 0,
        "label_international_bias": 0,
    },
    {
        "text": "Individuals with thick skin who can take criticism are preferred.",
        "label_bias": 1,
        "label_international_bias": 0,
    },
    {
        "text": "Candidates should have excellent English without grammatical errors.",
        "label_bias": 1,
        "label_international_bias": 1,
    },
    {
        "text": "We seek a mature candidate who can lead decisively.",
        "label_bias": 1,
        "label_international_bias": 0,
    },
    {
        "text": "Applicants must have perfect English with no mistakes.",
        "label_bias": 1,
        "label_international_bias": 1,
    },
    {
        "text": "We strongly prefer U.S.-based applicants for coordination reasons.",
        "label_bias": 1,
        "label_international_bias": 1,
    },
    {
        "text": "Energetic, high-stamina individuals encouraged to join the team.",
        "label_bias": 1,
        "label_international_bias": 0,
    },
    {
        "text": "We do not consider OPT/CPT candidates.",
        "label_bias": 2,
        "label_international_bias": 2,
    },
    {
        "text": "Our company fosters inclusion and actively supports visa sponsorship.",
        "label_bias": 0,
        "label_international_bias": 0,
    },
    {
        "text": "Applicants must fit our youthful company culture.",
        "label_bias": 2,
        "label_international_bias": 0,
    },
    {
        "text": "Candidates with international accents may struggle in this role.",
        "label_bias": 2,
        "label_international_bias": 2,
    },
    {
        "text": "Must be able to stand for long periods without accommodation.",
        "label_bias": 2,
        "label_international_bias": 0,
    },
    {
        "text": "Bilingual or multilingual candidates strongly encouraged to apply.",
        "label_bias": 0,
        "label_international_bias": 0,
    },
    {
        "text": "Work environment is highly competitive and not for everyone.",
        "label_bias": 1,
        "label_international_bias": 0,
    },
    {
        "text": "International students are welcome to apply.",
        "label_bias": 0,
        "label_international_bias": 0,
    },
    {
        "text": "English fluency required; international candidates may find the role challenging.",
        "label_bias": 1,
        "label_international_bias": 1,
    },
    {
        "text": "We cannot hire candidates who will need visa support in the future.",
        "label_bias": 1,
        "label_international_bias": 2,
    },
    {
        "text": "Our diverse workforce includes employees from over 20 countries.",
        "label_bias": 0,
        "label_international_bias": 0,
    },
    {
        "text": "Strong preference for candidates with U.S. work experience only.",
        "label_bias": 2,
        "label_international_bias": 2,
    },
    {
        "text": "Cultural fit is important; candidates should be familiar with Western norms.",
        "label_bias": 2,
        "label_international_bias": 1,
    },
    {
        "text": "We encourage individuals with disabilities to apply.",
        "label_bias": 0,
        "label_international_bias": 0,
    },
    {
        "text": "The candidate must be able to multitask in a chaotic environment.",
        "label_bias": 1,
        "label_international_bias": 0,
    },
    {
        "text": "Must speak English without noticeable mistakes.",
        "label_bias": 1,
        "label_international_bias": 1,
    },
    {
        "text": "Open to candidates requiring future visa sponsorship.",
        "label_bias": 0,
        "label_international_bias": 0,
    },
    {
        "text": "We prefer candidates who already understand North American business culture.",
        "label_bias": 1,
        "label_international_bias": 1,
    },
    # {
    #     "text": "Only apply if you have zero restrictions on work authorization.",
    #     "label_bias": 1,
    #     "label_international_bias": 2,
    # },
    # {
    #     "text": "We hire globally and support remote workers from multiple regions.",
    #     "label_bias": 0,
    #     "label_international_bias": 0,
    # },
    # {
    #     "text": "Must relocate to the U.S. without employer assistance.",
    #     "label_bias": 1,
    #     "label_international_bias": 2,
    # },
    # {
    #     "text": "Candidates should be enthusiastic, adaptable, and team-oriented.",
    #     "label_bias": 0,
    #     "label_international_bias": 0,
    # },
    # {
    #     "text": "We will not consider applicants requiring relocation visas.",
    #     "label_bias": 1,
    #     "label_international_bias": 2,
    # },
    # {
    #     "text": "Applicants must be from culturally similar backgrounds.",
    #     "label_bias": 2,
    #     "label_international_bias": 2,
    # },
    # {
    #     "text": "Strong problem-solving skills and collaboration mindset required.",
    #     "label_bias": 0,
    #     "label_international_bias": 0,
    # },
    # {
    #     "text": "We do not accept foreign degrees for this role.",
    #     "label_bias": 2,
    #     "label_international_bias": 2,
    # },
    # {
    #     "text": "Open to candidates from all educational and cultural backgrounds.",
    #     "label_bias": 0,
    #     "label_international_bias": 0,
    # },
    # {
    #     "text": "Seeking a physically strong individual who can handle demanding tasks.",
    #     "label_bias": 1,
    #     "label_international_bias": 0,
    # },
    # {
    #     "text": "Looking for an aggressive go-getter to push sales targets.",
    #     "label_bias": 1,
    #     "label_international_bias": 0,
    # },
    # {
    #     "text": "Applicants should have flawless English writing skills.",
    #     "label_bias": 1,
    #     "label_international_bias": 1,
    # },
    # {
    #     "text": "International travel experience a plus, but not required.",
    #     "label_bias": 0,
    #     "label_international_bias": 0,
    # },
    # {
    #     "text": "Candidates with overseas experience may not be ideal for this client base.",
    #     "label_bias": 2,
    #     "label_international_bias": 2,
    # },
    # {
    #     "text": "We seek candidates based solely on skills and potential.",
    #     "label_bias": 0,
    #     "label_international_bias": 0,
    # },
    # {
    #     "text": "You must fit our fast-paced startup culture.",
    #     "label_bias": 1,
    #     "label_international_bias": 0,
    # },
    {
        "text": "We cannot consider candidates requiring CPT or OPT authorization.",
        "label_bias": 2,
        "label_international_bias": 2,
    },
    {
        "text": "Candidates from multilingual backgrounds bring unique strengths to our team.",
        "label_bias": 0,
        "label_international_bias": 0,
    },
]


# Safety check – you MUST provide data before running the benchmark
if not TEST_SENTENCES:
    raise ValueError(
        "TEST_SENTENCES is empty. Please add labeled examples in "
        "backend/benchmark_bias_models.py before running this script."
    )


# ---------------------------------------------------------------------------
# 3. MNLI Model Wrapper (HF + ONNX INT8)
# ---------------------------------------------------------------------------

@dataclass
class MNLIModelWrapper:
    name: str
    tokenizer: Any
    model: Any
    entailment_idx: int
    provider: str  # "hf" or "onnx"
    session: Any = None  # for ONNX Runtime only

    def _prepare_inputs(self, text: str, hypothesis: str):
        encoded = self.tokenizer(
            text,
            hypothesis,
            return_tensors="pt",
            truncation=True,
            max_length=512,
        )
        return encoded

    def _predict_entailment_prob_hf(self, text: str, hypothesis: str) -> float:
        """Return P(entailment | premise=text, hypothesis) for HF model."""
        inputs = self._prepare_inputs(text, hypothesis)
        with torch.no_grad():
            outputs = self.model(**inputs)
            logits = outputs.logits[0].detach().cpu().numpy()
        probs = softmax(logits)
        return float(probs[self.entailment_idx])

    def _predict_entailment_prob_onnx(self, text: str, hypothesis: str) -> float:
        """Return P(entailment) for ONNX Runtime model."""
        inputs = self._prepare_inputs(text, hypothesis)
        # Only pass the inputs that were exported to ONNX
        ort_inputs = {
            "input_ids": inputs["input_ids"].cpu().numpy(),
        }
        if "attention_mask" in inputs:
            ort_inputs["attention_mask"] = inputs["attention_mask"].cpu().numpy()

        logits = self.session.run(None, ort_inputs)[0][0]
        probs = softmax(logits)
        return float(probs[self.entailment_idx])

    def predict_entailment_prob(self, text: str, hypothesis: str) -> float:
        if self.provider == "hf":
            return self._predict_entailment_prob_hf(text, hypothesis)
        elif self.provider == "onnx":
            return self._predict_entailment_prob_onnx(text, hypothesis)
        else:
            raise ValueError(f"Unknown provider: {self.provider}")

    def predict_bias_scores(self, text: str) -> Tuple[float, float]:
        """
        Returns:
          bias_prob            : Probability text is biased (any type)
          intl_bias_prob       : Probability text has intl/visa/cultural bias

        Implementation:
          - Two MNLI binary decisions using entailment:
              * biased vs neutral
              * international/visa/cultural vs neutral on that axis
        """

        # Binary biased vs neutral
        hyp_biased = "This job posting contains biased or exclusionary language."
        hyp_neutral = (
            "This job posting is neutral and inclusive with no biased language."
        )

        p_biased = self.predict_entailment_prob(text, hyp_biased)
        p_neutral = self.predict_entailment_prob(text, hyp_neutral)
        bias_prob = p_biased / (p_biased + p_neutral + 1e-10)

        # International / visa / cultural bias
        hyp_intl = (
            "This job posting discriminates against international students, "
            "visa holders, or people from certain cultural backgrounds."
        )
        hyp_no_intl = (
            "This job posting is neutral regarding international students, "
            "visa status, and cultural background."
        )

        p_intl = self.predict_entailment_prob(text, hyp_intl)
        p_no_intl = self.predict_entailment_prob(text, hyp_no_intl)
        intl_prob = p_intl / (p_intl + p_no_intl + 1e-10)

        return bias_prob, intl_prob


def softmax(x):
    x = np.array(x, dtype=np.float64)
    x = x - np.max(x)
    exp = np.exp(x)
    return exp / np.sum(exp)


def find_entailment_idx(config) -> int:
    """
    Given a HF config with id2label, return the index for ENTAILMENT.
    """
    id2label = config.id2label
    for idx, label in id2label.items():
        if "entail" in label.lower():
            return int(idx)
    raise ValueError(f"Could not find 'entailment' label in id2label: {id2label}")


# ---------------------------------------------------------------------------
# 4. Load HuggingFace models (Models 1 & 2)
# ---------------------------------------------------------------------------

def load_hf_mnli_model(model_name: str, device: str = "cpu") -> MNLIModelWrapper:
    print(f"\nLoading HF model: {model_name} on {device} ...")
    # For some models (e.g. MoritzLaurer/deberta-v3-base-mnli) the fast tokenizer
    # can require optional deps like `tiktoken`. To keep this script easy to run
    # in a lightweight environment, we disable the fast tokenizer for those.
    use_fast = True
    if "MoritzLaurer/deberta-v3-base-mnli" in model_name:
        use_fast = False

    tokenizer = AutoTokenizer.from_pretrained(model_name, use_fast=use_fast)
    model = AutoModelForSequenceClassification.from_pretrained(model_name)
    model.to(device)
    model.eval()

    entailment_idx = find_entailment_idx(model.config)

    return MNLIModelWrapper(
        name=model_name,
        tokenizer=tokenizer,
        model=model,
        entailment_idx=entailment_idx,
        provider="hf",
    )


# ---------------------------------------------------------------------------
# 5. Export & quantize DeBERTa MNLI to ONNX INT8 (Model 3)
# ---------------------------------------------------------------------------

def export_and_quantize_deberta_onnx(
    hf_model_name: str,
    onnx_dir: str = "onnx_models",
    force_export: bool = False,
) -> MNLIModelWrapper:
    """
    Exports MoritzLaurer/deberta-v3-base-mnli to ONNX and applies dynamic INT8
    quantization. Uses ONNX Runtime for inference on CPU (M2-friendly).

    NOTE:
      - First run will be slower (one-time ONNX export + quantization).
      - Subsequent runs will reuse the cached ONNX files in `onnx_models/`.
    """
    onnx_dir_path = Path(onnx_dir)
    onnx_dir_path.mkdir(parents=True, exist_ok=True)

    base_name = hf_model_name.split("/")[-1]
    onnx_fp32_path = onnx_dir_path / f"{base_name}.onnx"
    onnx_int8_path = onnx_dir_path / f"{base_name}-int8.onnx"

    tokenizer = AutoTokenizer.from_pretrained(hf_model_name)
    hf_model = AutoModelForSequenceClassification.from_pretrained(hf_model_name)
    entailment_idx = find_entailment_idx(hf_model.config)

    if not onnx_fp32_path.exists() or force_export:
        print(f"\nExporting {hf_model_name} to ONNX: {onnx_fp32_path} ...")
        hf_model.eval()
        dummy_inputs = tokenizer(
            "Dummy text for ONNX export.",
            "This is a hypothesis.",
            return_tensors="pt",
        )
        input_ids = dummy_inputs["input_ids"]
        attention_mask = dummy_inputs.get("attention_mask", None)

        input_names = ["input_ids"]
        dynamic_axes = {"input_ids": {0: "batch_size", 1: "sequence"}}
        example_inputs = (input_ids,)

        if attention_mask is not None:
            input_names.append("attention_mask")
            dynamic_axes["attention_mask"] = {0: "batch_size", 1: "sequence"}
            example_inputs = (input_ids, attention_mask)

        torch.onnx.export(
            hf_model,
            example_inputs,
            onnx_fp32_path.as_posix(),
            input_names=input_names,
            output_names=["logits"],
            opset_version=13,
            do_constant_folding=True,
            dynamic_axes=dynamic_axes,
        )
        print("ONNX export complete.")

    if not onnx_int8_path.exists() or force_export:
        print(f"\nQuantizing ONNX model to INT8: {onnx_int8_path} ...")
        quantize_dynamic(
            onnx_fp32_path.as_posix(),
            onnx_int8_path.as_posix(),
            weight_type=QuantType.QInt8,
        )
        print("Quantization complete.")

    # Validate ONNX model (best-effort only).
    # Some optimizer/quantization combinations can produce models that
    # trip the strict checker even though ONNX Runtime can still run them.
    # For hackathon benchmarking we prefer "runs" over "perfectly clean graph".
    try:
        onnx_model = onnx.load(onnx_int8_path.as_posix())
        onnx.checker.check_model(onnx_model)
    except Exception as e:  # noqa: BLE001
        print(
            "WARNING: ONNX checker reported a validation error for the "
            "quantized DeBERTa model. Proceeding anyway because many of "
            "these graphs still run correctly in ONNX Runtime.\n"
            f"Checker error was: {e}\n"
        )

    # Create ONNX Runtime session
    print("\nInitializing ONNX Runtime session (CPU) for INT8 model ...")
    sess_options = ort.SessionOptions()
    sess_options.graph_optimization_level = ort.GraphOptimizationLevel.ORT_ENABLE_ALL
    session = ort.InferenceSession(
        onnx_int8_path.as_posix(),
        sess_options,
        providers=["CPUExecutionProvider"],
    )

    # Wrap for unified interface
    return MNLIModelWrapper(
        name=f"{hf_model_name}-int8-onnx",
        tokenizer=tokenizer,
        model=None,
        entailment_idx=entailment_idx,
        provider="onnx",
        session=session,
    )


# ---------------------------------------------------------------------------
# 6. Benchmarking logic
# ---------------------------------------------------------------------------

def evaluate_model(
    wrapper: MNLIModelWrapper,
    n_runs: int = 5,
    bias_threshold: float = 0.5,
    intl_threshold: float = 0.5,
) -> Dict[str, Any]:
    """
    Evaluate a model (combined with lookup table) on TEST_SENTENCES.

    Returns a dict with:
      {
        "name": ...,
        "avg_latency_ms": ...,
        "accuracy": ...,
        "intl_recall": ...,
        "notes": ...
      }
    """

    print(f"\n=== Evaluating model: {wrapper.name} ===")

    # Warm-up run (ensures the model is "hot" before timing)
    _ = wrapper.predict_bias_scores(TEST_SENTENCES[0]["text"])

    total_latency = 0.0
    n_samples = len(TEST_SENTENCES)
    total_calls = 0

    # Metrics
    correct_bias = 0
    total_bias = n_samples

    intl_tp = 0
    intl_pos = 0

    # Progress tracking
    total_steps = n_runs * max(n_samples, 1)
    step = 0
    progress_interval = max(1, total_steps // 20)  # ~20 updates max

    # We repeat the entire dataset multiple times to smooth out timing noise
    for run in range(n_runs):
        for item in TEST_SENTENCES:
            step += 1

            text = item["text"]
            # Allow severity-style labels (0 = none, 1 = mild, 2 = strong) but
            # collapse them to a binary target for metrics: 0 vs >0.
            raw_bias = int(item.get("label_bias", 0))
            raw_intl = int(item.get("label_international_bias", 0))
            y_bias = 1 if raw_bias > 0 else 0
            y_intl = 1 if raw_intl > 0 else 0

            # Lookup first (fast, hash-based phrase table)
            dict_bias, dict_intl, _ = lookup_bias_flags(text)

            start = time.perf_counter()
            bias_prob, intl_prob = wrapper.predict_bias_scores(text)
            end = time.perf_counter()

            total_latency += (end - start)
            total_calls += 1

            # Combined pipeline prediction: dictionary OR model
            pred_bias = dict_bias or (bias_prob >= bias_threshold)
            pred_intl = dict_intl or (intl_prob >= intl_threshold)

            if int(pred_bias) == y_bias:
                correct_bias += 1

            if y_intl == 1:
                intl_pos += 1
                if pred_intl:
                    intl_tp += 1

            # Console progress indicator (percentage)
            if step % progress_interval == 0 or step == total_steps:
                percent = int(step * 100 / total_steps)
                print(
                    f"\r  Progress for {wrapper.name}: {step}/{total_steps} "
                    f"steps ({percent}%)",
                    end="",
                    flush=True,
                )

    # Finish the progress line cleanly
    print()

    avg_latency_ms = (total_latency / max(total_calls, 1)) * 1000.0
    accuracy = correct_bias / max(total_bias * n_runs, 1)
    intl_recall = intl_tp / max(intl_pos * n_runs, 1) if intl_pos > 0 else 0.0

    notes = f"{n_runs} runs, {n_samples} sentences each (lookup + MNLI)."

    return {
        "name": wrapper.name,
        "avg_latency_ms": avg_latency_ms,
        "accuracy": accuracy,
        "intl_recall": intl_recall,
        "notes": notes,
    }


def print_results_table(results: List[Dict[str, Any]]):
    # Simple ASCII table
    headers = [
        "Model",
        "Avg Latency (ms)",
        "Accuracy",
        "Intl Bias Recall",
        "Notes",
    ]
    col_widths = [30, 18, 10, 18, 40]

    def fmt_row(cols):
        return " | ".join(
            str(c).ljust(w)[:w] for c, w in zip(cols, col_widths)
        )

    print("\n" + "=" * 120)
    print(fmt_row(headers))
    print("-" * 120)
    for r in results:
        print(
            fmt_row(
                [
                    r["name"],
                    f"{r['avg_latency_ms']:.2f}",
                    f"{r['accuracy']:.3f}",
                    f"{r['intl_recall']:.3f}",
                    r["notes"],
                ]
            )
        )
    print("=" * 120 + "\n")


# ---------------------------------------------------------------------------
# 7. Main
# ---------------------------------------------------------------------------

def set_random_seeds(seed: int = 42):
    random.seed(seed)
    np.random.seed(seed)
    torch.manual_seed(seed)
    if torch.cuda.is_available():
        torch.cuda.manual_seed_all(seed)


def main():
    set_random_seeds(42)

    # Use CPU for fair comparison (and to match ONNX Runtime on M2)
    device = "cpu"

    # Model 1: BART-large MNLI
    model1 = load_hf_mnli_model("facebook/bart-large-mnli", device=device)

    # Model 2: DeBERTa v3 base MNLI (MoritzLaurer)
    model2_name = "MoritzLaurer/deberta-v3-base-mnli"
    model2 = load_hf_mnli_model(model2_name, device=device)

    # Model 3: INT8 ONNX DeBERTa (exported + quantized once, then reused)
    model3 = export_and_quantize_deberta_onnx(model2_name)

    # Increase to 100 if you want even smoother timing (at the cost of time)
    N_RUNS = 5

    results = []
    for wrapper in [model1, model2, model3]:
        res = evaluate_model(wrapper, n_runs=N_RUNS)
        results.append(res)

    print_results_table(results)


if __name__ == "__main__":
    main()


