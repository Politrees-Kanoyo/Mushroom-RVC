import os
import sys
from multiprocessing import cpu_count

import faiss
import numpy as np
from sklearn.cluster import MiniBatchKMeans

exp_dir = str(sys.argv[1])
index_algorithm = str(sys.argv[2])

try:
    feature_dir = os.path.join(exp_dir, "data", "features")
    model_name = os.path.basename(exp_dir)

    index_filename = f"{model_name}.index"
    index_filepath = os.path.join(exp_dir, index_filename)

    if os.path.exists(index_filepath):
        pass
    else:
        npys = []
        listdir_res = sorted(os.listdir(feature_dir))

        for name in listdir_res:
            file_path = os.path.join(feature_dir, name)
            phone = np.load(file_path)
            npys.append(phone)

        big_npy = np.concatenate(npys, axis=0)

        big_npy_idx = np.arange(big_npy.shape[0])
        np.random.shuffle(big_npy_idx)
        big_npy = big_npy[big_npy_idx]

        if big_npy.shape[0] > 2e5 and index_algorithm in ("Auto", "KMeans"):
            big_npy = (
                MiniBatchKMeans(
                    n_clusters=10000,
                    verbose=True,
                    batch_size=256 * cpu_count(),
                    compute_labels=False,
                    init="random",
                )
                .fit(big_npy)
                .cluster_centers_
            )

        n_ivf = min(int(16 * np.sqrt(big_npy.shape[0])), big_npy.shape[0] // 39)

        index_added = faiss.index_factory(768, f"IVF{n_ivf},Flat")
        index_ivf_added = faiss.extract_index_ivf(index_added)
        index_ivf_added.nprobe = 1
        index_added.train(big_npy)

        batch_size_add = 8192
        for i in range(0, big_npy.shape[0], batch_size_add):
            index_added.add(big_npy[i : i + batch_size_add])

        faiss.write_index(index_added, index_filepath)
        print(f"Индекс успешно сохранен - '{index_filepath}'")

except Exception as error:
    print(f"Произошла ошибка при извлечении индекса: {error}")
    print("Если вы запускаете этот код в виртуальной среде, убедитесь, что у вас достаточно GPU для генерации файла индекса.")
