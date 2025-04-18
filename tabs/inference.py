import os
import re

import gradio as gr

from rvc.infer.infer import rvc_infer
from tabs.components.modules import OUTPUT_FORMAT, update_models_list, process_file_upload, show_hop_slider, swap_visibility, swap_buttons, get_folders
from tabs.components.settings import settings


def inference_tab():
    with gr.Row():
        with gr.Column(scale=1, variant="panel"):
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
                rvc_pitch = gr.Slider(
                    minimum=-24,
                    maximum=24,
                    step=1,
                    value=0,
                    label="Регулировка тона",
                    info="-24 - мужской голос || 24 - женский голос",
                    interactive=True,
                    visible=True,
                )

        with gr.Column(scale=2, variant="panel"):
            with gr.Column() as upload_file:
                local_file = gr.Audio(
                    label="Аудио",
                    type="filepath",
                    show_download_button=False,
                    show_share_button=False,
                    interactive=True,
                    visible=True,
                )

            with gr.Column(visible=False) as enter_local_file:
                song_input = gr.Text(
                    label="Путь к файлу:",
                    info="Введите полный путь к файлу.",
                    interactive=True,
                    visible=True,
                )

            with gr.Column():
                show_upload_button = gr.Button(
                    value="Загрузить файл с устройства",
                    interactive=True,
                    visible=False,
                )
                show_enter_button = gr.Button(
                    value="Ввести путь к файлу",
                    interactive=True,
                    visible=True,
                )

    with gr.Group():
        with gr.Row(equal_height=True):
            generate_btn = gr.Button(
                value="Генерировать",
                variant="primary",
                interactive=True,
                visible=True,
                scale=2,
            )
            converted_voice = gr.Audio(
                label="Преобразованный голос",
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

    # Загрузка файлов
    local_file.input(process_file_upload, inputs=[local_file], outputs=[song_input, local_file])

    # Обновление кнопок
    show_upload_button.click(swap_visibility, outputs=[upload_file, enter_local_file, song_input, local_file])
    show_enter_button.click(swap_visibility, outputs=[enter_local_file, upload_file, song_input, local_file])
    show_upload_button.click(swap_buttons, outputs=[show_upload_button, show_enter_button])
    show_enter_button.click(swap_buttons, outputs=[show_enter_button, show_upload_button])

    # Показать hop_length
    f0_method.change(show_hop_slider, inputs=f0_method, outputs=hop_length)

    # Обновление списка моделей
    ref_btn.click(update_models_list, None, outputs=rvc_model)

    # Запуск процесса преобразования
    generate_btn.click(
        rvc_infer,
        inputs=[
            rvc_model,
            song_input,
            f0_method,
            f0_min,
            f0_max,
            hop_length,
            rvc_pitch,
            protect,
            index_rate,
            volume_envelope,
            output_format,
        ],
        outputs=[converted_voice],
    )
