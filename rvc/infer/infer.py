from multiprocessing import cpu_count

import torch
from fairseq import checkpoint_utils
from scipy.io import wavfile

from rvc.lib.algorithm.synthesizers import Synthesizer
from rvc.lib.my_utils import load_audio

from .pipeline import VC


# Конфигурация устройства и параметров
class Config:
    def __init__(self):
        self.device = self.get_device()
        self.n_cpu = cpu_count()
        self.gpu_name = None
        self.gpu_mem = None
        self.x_pad, self.x_query, self.x_center, self.x_max = self.device_config()

    def get_device(self):
        if torch.cuda.is_available():
            return "cuda"
        elif torch.backends.mps.is_available():
            return "mps"
        else:
            return "cpu"

    def device_config(self):
        if torch.cuda.is_available():
            print("Используемое устройство - CUDA")
            self._configure_gpu()
        elif torch.backends.mps.is_available():
            print("Используемое устройство - MPS")
            self.device = "mps"
        else:
            print("Используемое устройство - CPU")
            self.device = "cpu"

        x_pad, x_query, x_center, x_max = (1, 6, 38, 41)
        if self.gpu_mem is not None and self.gpu_mem <= 4:
            x_pad, x_query, x_center, x_max = (1, 5, 30, 32)

        return x_pad, x_query, x_center, x_max

    def _configure_gpu(self):
        self.gpu_name = torch.cuda.get_device_name(self.device)
        self.gpu_mem = int(
            torch.cuda.get_device_properties(self.device).total_memory
            / 1024
            / 1024
            / 1024
            + 0.4
        )


# Загрузка модели Hubert
def load_hubert(device, model_path):
    models, saved_cfg, task = checkpoint_utils.load_model_ensemble_and_task(
        [model_path], suffix=""
    )
    hubert = models[0].to(device)
    hubert = hubert.float()
    hubert.eval()
    return hubert


# Получение голосового преобразователя
def get_vc(device, config, model_path):
    cpt = torch.load(model_path, map_location="cpu", weights_only=True)
    if "config" not in cpt or "weight" not in cpt:
        raise ValueError(
            f"Некорректный формат для {model_path}. Используйте голосовую модель, обученную с использованием RVC v2."
        )

    tgt_sr = cpt["config"][-1]
    cpt["config"][-3] = cpt["weight"]["emb_g.weight"].shape[0]
    pitch_guidance = cpt.get("f0", 1)
    version = cpt.get("version", "v1")
    input_dim = 768 if version == "v2" else 256

    net_g = Synthesizer(*cpt["config"], use_f0=pitch_guidance, input_dim=input_dim)

    del net_g.enc_q
    net_g.load_state_dict(cpt["weight"], strict=False)
    net_g = net_g.to(device).float()
    net_g.eval()

    vc = VC(tgt_sr, config)
    return cpt, version, net_g, tgt_sr, vc


# Выполнение инференса с использованием RVC
def rvc_infer(
    index_path,
    index_rate,
    input_path,
    output_path,
    pitch,
    f0_method,
    cpt,
    version,
    net_g,
    filter_radius,
    tgt_sr,
    volume_envelope,
    protect,
    hop_length,
    vc,
    hubert_model,
    f0_min=50,
    f0_max=1100,
):
    audio = load_audio(input_path, 16000)
    pitch_guidance = cpt.get("f0", 1)
    audio_opt = vc.pipeline(
        hubert_model,
        net_g,
        0,
        audio,
        input_path,
        pitch,
        f0_method,
        index_path,
        index_rate,
        pitch_guidance,
        filter_radius,
        tgt_sr,
        0,
        volume_envelope,
        version,
        protect,
        hop_length,
        f0_file=None,
        f0_min=f0_min,
        f0_max=f0_max,
    )
    wavfile.write(output_path, tgt_sr, audio_opt)
