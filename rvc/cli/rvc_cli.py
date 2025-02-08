from assets.logging_config import configure_logging
configure_logging()

import argparse
import os

from rvc.infer.infer import RVC_MODELS_DIR, rvc_infer

parser = argparse.ArgumentParser(description="Замена голоса в директории output/", add_help=True)
parser.add_argument("-i", "--input_path", type=str, required=True)
parser.add_argument("-m", "--model_name", type=str, required=True)
parser.add_argument("-p", "--pitch", type=float, required=True)
parser.add_argument("-ir", "--index_rate", type=float, default=0)
parser.add_argument("-fr", "--filter_radius", type=int, default=3)
parser.add_argument("-rms", "--volume_envelope", type=float, default=0.25)
parser.add_argument("-f0", "--method", type=str, default="rmvpe")
parser.add_argument("-hop", "--hop_length", type=int, default=128)
parser.add_argument("-pro", "--protect", type=float, default=0.33)
parser.add_argument("-f0min", "--f0_min", type=int, default="50")
parser.add_argument("-f0max", "--f0_max", type=int, default="1100")
parser.add_argument("-f", "--format", type=str, default="mp3")
args = parser.parse_args()

output_path = rvc_infer(
    voice_rvc=args.model_name,
    voice_tts=None,
    input_path_link=args.input_path,
    input_text=None,
    f0_method=args.method,
    hop_length=args.hop_length,
    pitch=args.pitch,
    index_rate=args.index_rate,
    volume_envelope=args.volume_envelope,
    protect=args.protect,
    filter_radius=args.filter_radius,
    f0_min=args.f0_min,
    f0_max=args.f0_max,
    output_format=args.format,
    use_tts=False,
)

print(f"\033[1;92m\nГолос успешно заменен!\n\033[0m — {output_path}")
