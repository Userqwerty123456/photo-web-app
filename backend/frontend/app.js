const video = document.getElementById("video");
const canvas = document.getElementById("canvas");

const preview = document.getElementById("preview");
const previewImage = document.getElementById("previewImage");

const gallery = document.getElementById("gallery");
const statusText = document.getElementById("status");

const startCameraButton = document.getElementById("startCamera");
const takePhotoButton = document.getElementById("takePhoto");
const switchCameraButton = document.getElementById("switchCamera");

const uploadPhotoButton = document.getElementById("uploadPhoto");
const retakePhotoButton = document.getElementById("retakePhoto");

const countdown = document.getElementById("robot-countdown");
const countdownNumber = document.getElementById("countdown-number");
const countdownText = document.getElementById("countdown-text");

const snapshot = document.getElementById("robot-snapshot");
const cameraCard = document.querySelector(".camera-card");

let stream = null;
let facingMode = "user";
let photoBlob = null;
let captureInProgress = false;


/* =========================
   STATUS
   ========================= */

function status(message) {
    statusText.textContent = message;
}


/* =========================
   КАМЕРА
   ========================= */

async function startCamera() {

    try {

        if (stream) {
            stream.getTracks().forEach(track => track.stop());
        }

        stream = await navigator.mediaDevices.getUserMedia({

            video: {
                facingMode: facingMode,

                width: {
                    ideal: 1920
                },

                height: {
                    ideal: 1080
                }
            },

            audio: false
        });

        video.srcObject = stream;

        video.style.display = "block";

        document.getElementById(
            "camera-placeholder"
        ).style.display = "none";

        startCameraButton.classList.add("hidden");

        takePhotoButton.classList.remove("hidden");

        switchCameraButton.classList.remove("hidden");

        status("Камера готова.");

    } catch (error) {

        console.error("Ошибка камеры:", error);

        status(
            "Не удалось открыть камеру. Разреши доступ к камере в браузере."
        );

    }

}


/* =========================
   СОЗДАТЬ ФОТО
   ========================= */

function takePhoto() {

    return new Promise((resolve, reject) => {

        if (!stream) {
            reject(new Error("Камера не запущена"));
            return;
        }

        if (!video.videoWidth || !video.videoHeight) {
            reject(new Error("Камера ещё не готова"));
            return;
        }

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        const context = canvas.getContext("2d");

        context.setTransform(
            1,
            0,
            0,
            1,
            0,
            0
        );

        if (facingMode === "user") {

            context.translate(
                canvas.width,
                0
            );

            context.scale(
                -1,
                1
            );

        }

        context.drawImage(
            video,
            0,
            0,
            canvas.width,
            canvas.height
        );

        canvas.toBlob(

            blob => {

                if (!blob) {

                    reject(
                        new Error(
                            "Не удалось создать фото"
                        )
                    );

                    return;
                }

                photoBlob = blob;

                previewImage.src =
                    URL.createObjectURL(blob);

                preview.classList.remove(
                    "hidden"
                );

                resolve(blob);

            },

            "image/jpeg",

            0.92
        );

    });

}


/* =========================
   ЗАГРУЗКА ФОТО
   ========================= */

async function uploadPhoto() {

    if (!photoBlob) {
        return;
    }

    const formData = new FormData();

    formData.append(
        "file",
        photoBlob,
        "photo.jpg"
    );

    uploadPhotoButton.disabled = true;

    status("Загрузка фото...");

    try {

        const response = await fetch(
            "/api/upload",
            {
                method: "POST",
                body: formData
            }
        );

        const data =
            await response.json();

        if (!response.ok) {

            throw new Error(
                data.detail ||
                "Ошибка загрузки"
            );

        }

        status("✅ Фото сохранено!");

        preview.classList.add(
            "hidden"
        );

        photoBlob = null;

        await loadGallery();

    } catch (error) {

        console.error(
            "Ошибка загрузки:",
            error
        );

        status(
            "❌ " + error.message
        );

    } finally {

        uploadPhotoButton.disabled = false;

    }

}


/* =========================
   ПЕРЕСНЯТЬ
   ========================= */

function retakePhoto() {

    photoBlob = null;

    preview.classList.add(
        "hidden"
    );

    status(
        "Можно сделать новый снимок."
    );

}


/* =========================
   ПЕРЕКЛЮЧИТЬ КАМЕРУ
   ========================= */

async function switchCamera() {

    facingMode =
        facingMode === "user"
            ? "environment"
            : "user";

    await startCamera();

}


/* =========================
   ГАЛЕРЕЯ
   ========================= */

async function loadGallery() {

    try {

        const response =
            await fetch("/api/photos");

        const data =
            await response.json();

        gallery.innerHTML = "";

        if (
            !data.photos ||
            data.photos.length === 0
        ) {

            gallery.innerHTML =
                "<p>Пока нет фотографий.</p>";

            return;
        }

        data.photos.forEach(photo => {

            const card =
                document.createElement(
                    "div"
                );

            card.className =
                "photo-card";

            const img =
                document.createElement(
                    "img"
                );

            img.src = photo.url;

            img.alt =
                "Фотография";

            const deleteButton =
                document.createElement(
                    "button"
                );

            deleteButton.className =
                "delete-photo";

            deleteButton.textContent =
                "🗑️";

            deleteButton.title =
                "Удалить фотографию";

            deleteButton.addEventListener(
                "click",
                () => deletePhoto(photo)
            );

            card.appendChild(img);

            card.appendChild(
                deleteButton
            );

            gallery.appendChild(card);

        });

    } catch (error) {

        console.error(
            "Ошибка загрузки галереи:",
            error
        );

    }

}


/* =========================
   УДАЛЕНИЕ ФОТО
   ========================= */

async function deletePhoto(photo) {

    const confirmed =
        confirm(
            "Удалить эту фотографию?"
        );

    if (!confirmed) {
        return;
    }

    try {

        const response =
            await fetch(
                `/api/photos/${encodeURIComponent(photo.filename)}`,
                {
                    method: "DELETE"
                }
            );

        const data =
            await response.json();

        if (!response.ok) {

            throw new Error(
                data.detail ||
                "Не удалось удалить фото"
            );

        }

        status(
            "🗑️ Фото удалено."
        );

        await loadGallery();

    } catch (error) {

        console.error(
            "Ошибка удаления:",
            error
        );

        status(
            "❌ " + error.message
        );

    }

}


/* =========================
   РОБОТ
   ========================= */

async function checkRobotSignal() {

    if (captureInProgress) {
        return;
    }

    try {

        const response =
            await fetch(
                "/api/robot/status"
            );

        if (!response.ok) {
            return;
        }

        const data =
            await response.json();

        if (data.capture === true) {

            startRobotSelfie();

        }

    } catch (error) {

        console.error(
            "Ошибка проверки сигнала робота:",
            error
        );

    }

}


/* =========================
   АВТОМАТИЧЕСКОЕ СЕЛФИ
   ========================= */

async function startRobotSelfie() {

    if (captureInProgress) {
        return;
    }

    if (!stream) {

        status(
            "Камера ещё не запущена."
        );

        return;
    }

    captureInProgress = true;

    try {

        countdown.classList.remove(
            "hidden"
        );

        snapshot.classList.add(
            "hidden"
        );

        cameraCard.classList.add(
            "robot-counting"
        );

        for (
            let count = 5;
            count >= 1;
            count--
        ) {

            countdownNumber.textContent =
                count;

            countdownText.textContent =
                `Селфи через ${count} секунд...`;

            status(
                `Селфи через ${count} секунд...`
            );

            countdownNumber.style.animation =
                "none";

            void countdownNumber.offsetWidth;

            countdownNumber.style.animation =
                "countdown-pop 0.8s ease";

            await new Promise(
                resolve =>
                    setTimeout(
                        resolve,
                        1000
                    )
            );

        }

        countdown.classList.add(
            "hidden"
        );

        cameraCard.classList.remove(
            "robot-counting"
        );

        snapshot.classList.remove(
            "hidden"
        );

        status("📸 Снимок!");

        await takePhoto();

        await new Promise(
            resolve =>
                setTimeout(
                    resolve,
                    700
                )
        );

        snapshot.classList.add(
            "hidden"
        );

        await uploadPhoto();

    } catch (error) {

        console.error(
            "Ошибка автоматического селфи:",
            error
        );

        countdown.classList.add(
            "hidden"
        );

        snapshot.classList.add(
            "hidden"
        );

        cameraCard.classList.remove(
            "robot-counting"
        );

        status(
            "❌ Ошибка создания фото: " +
            error.message
        );

    } finally {

        captureInProgress = false;

    }

}


/* =========================
   КНОПКИ
   ========================= */

startCameraButton.addEventListener(
    "click",
    startCamera
);

takePhotoButton.addEventListener(
    "click",
    async () => {

        try {

            await takePhoto();

            status(
                "Фото готово. Можно сохранить."
            );

        } catch (error) {

            status(
                "❌ " + error.message
            );

        }

    }
);

switchCameraButton.addEventListener(
    "click",
    switchCamera
);

uploadPhotoButton.addEventListener(
    "click",
    uploadPhoto
);

retakePhotoButton.addEventListener(
    "click",
    retakePhoto
);


/* =========================
   СТАРТ
   ========================= */

loadGallery();

setInterval(
    checkRobotSignal,
    500
);