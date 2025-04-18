import os
import re

import gradio as gr

from rvc.infer.infer import rvc_edgetts_infer
from tabs.components.modules import OUTPUT_FORMAT, update_edge_voices, get_folders, update_models_list, show_hop_slider, edge_voices
from tabs.components.settings import settings


def edge_tts_tab():
    with gr.Row():
        with gr.Column(variant="panel", scale=1):
            with gr.Group():
                rvc_model = gr.Dropdown(
                    label="Голосовые модели:",
                    choices=get_folders(),
                    interactive=True,
                    visible=True,
                )
                ref_btn = gr.Button(
                    value="Обновить список моделей",
                    variant="primary",
                    interactive=True,
                    visible=True,
                )
            with gr.Group():
                language = gr.Dropdown(
                    label="Язык",
                    choices=list(edge_voices.keys()),
                    interactive=True,
                    visible=True,
                )
                tts_voice = gr.Dropdown(
                    value="en-GB-SoniaNeural",
                    label="Голос",
                    choices=["en-GB-SoniaNeural", "en-GB-RyanNeural"],
                    interactive=True,
                    visible=True,
                )
        with gr.Column(variant="panel", scale=2):
            rvc_pitch = gr.Slider(
                minimum=-24,
                maximum=24,
                step=1,
                value=0,
                label="Регулировка высоты тона",
                info="-24 - мужской голос || 24 - женский голос",
                interactive=True,
                visible=True,
            )
            synth_voice = gr.Audio(label="Синтзированный TTS голос")

    with gr.Accordion("Настройки синтеза речи", open=False):
        with gr.Group():
            with gr.Row():
                tts_pitch = gr.Slider(
                    minimum=-100,
                    maximum=100,
                    step=1,
                    value=0,
                    label="Регулировка высоты тона TTS",
                    info="-100 - мужской голос || 100 - женский голос",
                    interactive=True,
                    visible=True,
                )
                tts_volume = gr.Slider(
                    minimum=-100,
                    maximum=100,
                    step=1,
                    value=0,
                    label="Громкость речи",
                    info="Громкость воспроизведения синтеза речи",
                    interactive=True,
                    visible=True,
                )
                tts_rate = gr.Slider(
                    minimum=-100,
                    maximum=100,
                    step=1,
                    value=0,
                    label="Скорость речи",
                    info="Скорость воспроизведения синтеза речи",
                    interactive=True,
                    visible=True,
                )

    tts_text = gr.Textbox(label="Введите текст", lines=5)

    with gr.Group():
        with gr.Row(equal_height=True):
            generate_btn = gr.Button(
                value="Генерировать",
                variant="primary",
                interactive=True,
                visible=True,
                scale=2,
            )
            converted_synth_voice = gr.Audio(
                label="Преобразованный TTS голос",
                interactive=False,
                visible=True,
                scale=9,
            )
            with gr.Column(min_width=160):
                output_format = gr.Dropdown(
                    value="mp3",
                    label="Формат файла",
                    choices=OUTPUT_FORMAT,
                    interactive=True,
                    visible=True,
                )

    # Компонент настроек
    f0_method, hop_length, index_rate, volume_envelope, protect, f0_min, f0_max = settings()

    # Обновление списка TTS-голосов
    language.change(update_edge_voices, inputs=language, outputs=tts_voice)

    # Показать hop_length
    f0_method.change(show_hop_slider, inputs=f0_method, outputs=hop_length)

    # Обновление списка моделей
    ref_btn.click(update_models_list, None, outputs=rvc_model)

    # Запуск процесса преобразования
    generate_btn.click(
        rvc_edgetts_infer,
        inputs=[
            rvc_model,
            f0_method,
            f0_min,
            f0_max,
            hop_length,
            rvc_pitch,
            protect,
            index_rate,
            volume_envelope,
            output_format,
            tts_voice,
            tts_text,
            tts_rate,
            tts_volume,
            tts_pitch,
        ],
        outputs=[synth_voice, converted_synth_voice],
    )
