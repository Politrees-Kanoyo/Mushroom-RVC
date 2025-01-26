import argparse
import os

from rvc.infer.infer import rvc_infer, RVC_MODELS_DIR

parser = argparse.ArgumentParser(
    description="Замена голоса в директории output/", add_help=True
)
parser.add_argument("-i", "--text_input", type=str, required=True)
parser.add_argument("-m", "--model_name", type=str, required=True)
parser.add_argument("-v", "--tts_voice", type=str, required=True)
parser.add_argument("-p", "--pitch", type=float, required=True)
parser.add_argument("-ir", "--index_rate", type=float, default=0)
parser.add_argument("-fr", "--filter_radius", type=int, default=3)
parser.add_argument("-rms", "--volume_envelope", type=float, default=0.25)
parser.add_argument("-f0", "--method", type=str, default="rmvpe+")
parser.add_argument("-hop", "--hop_length", type=int, default=128)
parser.add_argument("-pro", "--protect", type=float, default=0.33)
parser.add_argument("-f0min", "--f0_min", type=int, default="50")
parser.add_argument("-f0max", "--f0_max", type=int, default="1100")
parser.add_argument("-f", "--format", type=str, default="mp3")
args = parser.parse_args()

model_name = args.model_name
if not os.path.exists(os.path.join(RVC_MODELS_DIR, model_name)):
    raise Exception(
        f"\033[91mОШИБКА!\033[0m Модель {rvc_model} не обнаружена. Возможно, вы допустили ошибку в названии или указали неверную ссылку при установке."
    )

output_path = rvc_infer(
    voice_rvc=model_name,
    voice_tts=args.tts_voice,
    input_audio=None,
    input_text=args.text_input,
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
    use_tts=True,
)

print(f"\033[1;92m\nГолос успешно заменен!\n\033[0m — {output_path}")
