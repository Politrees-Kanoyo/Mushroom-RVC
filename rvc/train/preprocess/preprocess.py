import multiprocessing
import os
import sys
import traceback

import librosa
import numpy as np
from scipy import signal
from scipy.io import wavfile

sys.path.append(os.getcwd())

from rvc.lib.audio import load_audio
from rvc.train.preprocess.slicer import Slicer

# Парсинг аргументов командной строки
exp_dir = sys.argv[1]  # Директория для сохранения результатов
input_root = sys.argv[2]  # Директория с входными аудиофайлами
percentage = float(sys.argv[3])  # Длина сегмента в секундах
sample_rate = int(sys.argv[4])  # Частота дискретизации
normalize = sys.argv[5] == "True"  # Флаг для включения/выключения нормализации

# Константы
RES_TYPE = "soxr_vhq"  # Тип ресемплинга
SAMPLE_RATE_16K = 16000  # Частота дискретизации 16 кГц
sr_target = sample_rate  # Целевая частота дискретизации
num_processes = os.cpu_count()  # Количество процессов


class PreProcess:
    def __init__(self, sample_rate, sr_target, exp_dir, percentage=3.0, normalize=True):
        # Директории для сохранения обработанных аудиофайлов
        self.gt_wavs_dir = os.path.join(exp_dir, "data", "sliced_audios")
        self.wavs16k_dir = os.path.join(exp_dir, "data", "sliced_audios_16k")

        # Создаем директории, если они не существуют
        os.makedirs(self.gt_wavs_dir, exist_ok=True)
        os.makedirs(self.wavs16k_dir, exist_ok=True)

        # Инициализация Slicer для нарезки аудио
        self.slicer = Slicer(
            sr=sample_rate,
            threshold=-42,
            min_length=1500,
            min_interval=400,
            hop_size=15,
            max_sil_kept=500,
        )
        self.sample_rate = sample_rate  # Частота дискретизации
        self.b_high, self.a_high = signal.butter(N=5, Wn=48, btype="high", fs=self.sample_rate)  # Фильтр высоких частот
        self.percentage = percentage  # Длина сегмента
        self.overlap = 0.3  # Перекрытие между сегментами
        self.tail = self.percentage + self.overlap  # Хвост для обработки
        self.max_amplitude = 0.9  # Максимальное значение для нормализации
        self.alpha = 0.75  # Коэффициент для нормализации
        self.sr_target = sr_target  # Целевая частота дискретизации
        self.normalize = normalize  # Флаг для включения/выключения нормализации

    def norm_write(self, tmp_audio, idx0, idx1):
        # Проверка на превышение максимального уровня сигнала
        tmp_max = np.abs(tmp_audio).max()
        if tmp_max > 2.5:
            print(f"{idx0}-{idx1}-{tmp_max}-filtered")
            return

        # Ресемплирование аудио до целевой частоты дискретизации
        tmp_audio = librosa.resample(tmp_audio, orig_sr=self.sample_rate, target_sr=self.sr_target, res_type=RES_TYPE)

        # Применение нормализации
        if self.normalize:
            tmp_audio = (tmp_audio / tmp_max * (self.max_amplitude * self.alpha)) + (1 - self.alpha) * tmp_audio

        # Сохранение аудио в формате WAV
        wavfile.write(f"{self.gt_wavs_dir}/{idx0}_{idx1}.wav", self.sr_target, tmp_audio.astype(np.float32))

        # Ресемплирование аудио до 16 кГц
        tmp_audio = librosa.resample(tmp_audio, orig_sr=self.sample_rate, target_sr=SAMPLE_RATE_16K, res_type=RES_TYPE)

        # Сохранение аудио в формате WAV (16 кГц)
        wavfile.write(f"{self.wavs16k_dir}/{idx0}_{idx1}.wav", SAMPLE_RATE_16K, tmp_audio.astype(np.float32))

    def pipeline(self, path, idx0):
        try:
            # Загрузка аудио
            audio = load_audio(path, self.sr_target)
            # Применение фильтра высоких частот
            audio = signal.lfilter(self.b_high, self.a_high, audio)

            idx1 = 0
            # Нарезка аудио на сегменты
            for audio in self.slicer.slice(audio):
                i = 0
                while True:
                    # Вычисление начальной точки сегмента
                    start = int(self.sample_rate * (self.percentage - self.overlap) * i)
                    i += 1
                    # Проверка, остался ли хвост аудио
                    if len(audio[start:]) > self.tail * self.sample_rate:
                        tmp_audio = audio[start : start + int(self.percentage * self.sample_rate)]
                        self.norm_write(tmp_audio, idx0, idx1)
                        idx1 += 1
                    else:
                        tmp_audio = audio[start:]
                        self.norm_write(tmp_audio, idx0, idx1)
                        idx1 += 1
                        break
            print(f"{path}\t-> Success")
        except Exception:
            raise RuntimeError(f"{path}\t-> {traceback.format_exc()}")

    def pipeline_mp(self, infos):
        # Обработка списка файлов
        for path, idx0 in infos:
            self.pipeline(path, idx0)

    def pipeline_mp_inp_dir(self, input_root, num_processes):
        print("Обработка датасета...")
        try:
            # Сбор информации о файлах в директории
            infos = [(os.path.join(input_root, name), idx) for idx, name in enumerate(sorted(list(os.listdir(input_root))))]

            # Параллельная обработка
            ps = []
            for i in range(num_processes):
                p = multiprocessing.Process(target=self.pipeline_mp, args=(infos[i::num_processes],))
                ps.append(p)
                p.start()
            for p in ps:
                p.join()
            print("Обработка успешно завершена!")
        except Exception:
            raise RuntimeError(f"Ошибка! {traceback.format_exc()}")


def preprocess_trainset(input_root, sample_rate, num_processes, exp_dir, percentage, normalize):
    # Инициализация и запуск обработки
    pp = PreProcess(sample_rate, sr_target, exp_dir, percentage, normalize)
    pp.pipeline_mp_inp_dir(input_root, num_processes)


if __name__ == "__main__":
    # Запуск препроцессинга
    preprocess_trainset(input_root, sample_rate, num_processes, exp_dir, percentage, normalize)
