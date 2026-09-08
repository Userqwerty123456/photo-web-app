"use strict";


/* =========================================================
   ELEMENTS
========================================================= */

const video =
    document.getElementById("video");

const canvas =
    document.getElementById("canvas");

const cameraScreen =
    document.getElementById("cameraScreen");

const photoPreviewScreen =
    document.getElementById(
        "photoPreviewScreen"
    );

const startCameraButton =
    document.getElementById(
        "startCamera"
    );

const rotateCameraButton =
    document.getElementById(
        "rotateCamera"
    );

const takePhotoButton =
    document.getElementById(
        "takePhoto"
    );

const stopCameraButton =
    document.getElementById(
        "stopCamera"
    );

const savePhotoButton =
    document.getElementById(
        "savePhoto"
    );

const retakePhotoButton =
    document.getElementById(
        "retakePhoto"
    );

const statusElement =
    document.getElementById(
        "status"
    );

const countdownElement =
    document.getElementById(
        "countdown"
    );

const galleryElement =
    document.getElementById(
        "gallery"
    );

const emptyGalleryElement =
    document.getElementById(
        "emptyGallery"
    );

const photoCountElement =
    document.getElementById(
        "photoCount"
    );

const refreshGalleryButton =
    document.getElementById(
        "refreshGallery"
    );

const photoModal =
    document.getElementById(
        "photoModal"
    );

const modalImage =
    document.getElementById(
        "modalImage"
    );

const closeModalButton =
    document.getElementById(
        "closeModal"
    );

const prevPhotoButton =
    document.getElementById(
        "prevPhoto"
    );

const nextPhotoButton =
    document.getElementById(
        "nextPhoto"
    );

const modalInfo =
    document.getElementById(
        "modalInfo"
    );


/* =========================================================
   STATE
========================================================= */

let stream = null;


/*
 * user = фронтальная
 * environment = основная
 */

let facingMode = "user";


/*
 * Фотографии с сервера.
 */

let photos = [];


/*
 * Индекс фотографии,
 * открытой в просмотрщике.
 */

let currentPhotoIndex = -1;


/*
 * Фото, которое сейчас
 * находится в предпросмотре
 * и ещё НЕ сохранено.
 */

let pendingPhotoBlob = null;


/*
 * Чтобы два отсчёта одновременно
 * не запускались.
 */

let countdownRunning = false;


/*
 * Опрос команды робота.
 */

let robotPolling = null;


/* =========================================================
   STATUS
========================================================= */

function status(message) {

    if (!statusElement) {
        return;
    }

    statusElement.textContent =
        message;

}


/* =========================================================
   CAMERA
========================================================= */

async function startCamera() {

    try {

        status(
            "📷 Запрашиваем доступ к камере..."
        );


        /*
         * Останавливаем старый поток.
         */

        if (stream) {

            stream
                .getTracks()
                .forEach(
                    track =>
                        track.stop()
                );

        }


        /*
         * Проверяем поддержку камеры.
         */

        if (
            !navigator.mediaDevices ||
            !navigator.mediaDevices.getUserMedia
        ) {

            throw new Error(
                "Браузер не поддерживает камеру."
            );

        }


        /*
         * Запускаем выбранную камеру.
         */

        stream =
            await navigator
                .mediaDevices
                .getUserMedia({

                    video: {

                        facingMode:
                            facingMode,

                        width: {
                            ideal: 1920
                        },

                        height: {
                            ideal: 1080
                        }

                    },

                    audio: false

                });


        video.srcObject =
            stream;


        /*
         * Никакого зеркала.
         */

        video.style.transform =
            "scaleX(1)";


        await video.play();


        /*
         * Показываем камеру.
         */

        cameraScreen
            .classList
            .remove("hidden");

        photoPreviewScreen
            .classList
            .add("hidden");


        status(
            facingMode === "user"
                ? "🤳 Фронтальная камера включена."
                : "📷 Основная камера включена."
        );


    } catch (error) {

        console.error(
            "Camera error:",
            error
        );


        stream = null;


        status(
            "❌ Не удалось включить камеру: " +
            error.message
        );

    }

}


/* =========================================================
   ROTATE CAMERA
========================================================= */

async function rotateCamera() {

    /*
     * Меняем камеру.
     */

    if (facingMode === "user") {

        facingMode =
            "environment";

    } else {

        facingMode =
            "user";

    }


    status(
        "🔄 Переключаем камеру..."
    );


    await startCamera();

}


/* =========================================================
   STOP CAMERA
========================================================= */

function stopCamera() {

    if (stream) {

        stream
            .getTracks()
            .forEach(
                track =>
                    track.stop()
            );

    }


    stream = null;

    video.srcObject = null;


    status(
        "⛔ Камера выключена."
    );

}


/* =========================================================
   TAKE PHOTO
========================================================= */

async function takePhoto() {

    if (countdownRunning) {
        return;
    }


    if (!stream) {

        status(
            "❌ Сначала включите камеру."
        );

        return;

    }


    if (
        video.readyState <
        HTMLMediaElement.HAVE_CURRENT_DATA
    ) {

        status(
            "⏳ Камера ещё запускается..."
        );

        return;

    }


    /*
     * Запускаем обратный отсчёт.
     */

    await startCountdown();

}


/* =========================================================
   COUNTDOWN
========================================================= */

async function startCountdown() {

    if (countdownRunning) {
        return;
    }


    countdownRunning = true;


    try {

        for (
            let number = 5;
            number >= 1;
            number--
        ) {

            countdownElement.textContent =
                number;

            countdownElement
                .classList
                .add("show");


            await sleep(1000);

        }


        countdownElement.textContent =
            "📸";


        await sleep(350);


        countdownElement
            .classList
            .remove("show");


        /*
         * Создаём фото,
         * но пока НЕ сохраняем.
         */

        await createPhotoPreview();


    } finally {

        countdownElement
            .classList
            .remove("show");

        countdownElement.textContent =
            "";


        countdownRunning = false;

    }

}


/* =========================================================
   CREATE PHOTO PREVIEW
========================================================= */

async function createPhotoPreview() {

    try {

        const width =
            video.videoWidth || 1280;

        const height =
            video.videoHeight || 720;


        canvas.width =
            width;

        canvas.height =
            height;


        const context =
            canvas.getContext(
                "2d"
            );


        /*
         * Сбрасываем трансформацию.
         */

        context.setTransform(
            1,
            0,
            0,
            1,
            0,
            0
        );


        /*
         * Рисуем реальное изображение.
         *
         * НЕ зеркалим.
         */

        context.drawImage(
            video,
            0,
            0,
            width,
            height
        );


        /*
         * Получаем Blob.
         */

        pendingPhotoBlob =
            await new Promise(
                resolve => {

                    canvas.toBlob(
                        resolve,
                        "image/jpeg",
                        0.92
                    );

                }
            );


        if (!pendingPhotoBlob) {

            throw new Error(
                "Не удалось создать фотографию."
            );

        }


        /*
         * Переходим на экран
         * просмотра.
         */

        cameraScreen
            .classList
            .add("hidden");

        photoPreviewScreen
            .classList
            .remove("hidden");


        status(
            "📸 Фото готово. Сохранить или переснять?"
        );


    } catch (error) {

        console.error(
            "Photo preview error:",
            error
        );


        status(
            "❌ Ошибка создания фото."
        );

    }

}


/* =========================================================
   SAVE PHOTO
========================================================= */

async function savePhoto() {

    if (!pendingPhotoBlob) {

        status(
            "❌ Нет фотографии для сохранения."
        );

        return;

    }


    try {

        status(
            "☁️ Сохраняем фотографию..."
        );


        const formData =
            new FormData();


        formData.append(
            "file",
            pendingPhotoBlob,
            "photo.jpg"
        );


        const response =
            await fetch(
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
                "Не удалось сохранить фото."
            );

        }


        /*
         * Фото успешно сохранено.
         */

        pendingPhotoBlob =
            null;


        status(
            "✅ Фотография сохранена."
        );


        /*
         * Обновляем галерею.
         */

        await loadGallery();


        /*
         * Возвращаемся к камере.
         */

        photoPreviewScreen
            .classList
            .add("hidden");

        cameraScreen
            .classList
            .remove("hidden");


    } catch (error) {

        console.error(
            "Save photo error:",
            error
        );


        status(
            "❌ " + error.message
        );

    }

}


/* =========================================================
   RETAKE PHOTO
========================================================= */

async function retakePhoto() {

    /*
     * Удаляем несохранённое фото
     * из памяти.
     */

    pendingPhotoBlob =
        null;


    /*
     * Возвращаемся к камере.
     */

    photoPreviewScreen
        .classList
        .add("hidden");

    cameraScreen
        .classList
        .remove("hidden");


    status(
        "🔄 Готово. Можно переснять."
    );


    /*
     * Если поток камеры почему-то
     * остановился — запускаем заново.
     */

    if (!stream) {

        await startCamera();

    }

}


/* =========================================================
   UPLOAD PHOTO
========================================================= */

/*
 * Оставляем отдельную функцию для совместимости
 * с логикой приложения.
 */

async function uploadPhoto() {

    if (!pendingPhotoBlob) {
        return;
    }

    await savePhoto();

}


/* =========================================================
   LOAD GALLERY
========================================================= */

async function loadGallery() {

    try {

        const response =
            await fetch(
                "/api/photos",
                {
                    cache: "no-store"
                }
            );


        const data =
            await response.json();


        if (!response.ok) {

            throw new Error(
                data.detail ||
                "Не удалось получить фотографии."
            );

        }


        photos =
            Array.isArray(
                data.photos
            )
                ? data.photos
                : [];


        renderGallery();


    } catch (error) {

        console.error(
            "Gallery error:",
            error
        );


        status(
            "❌ Не удалось загрузить галерею."
        );

    }

}


/* =========================================================
   RENDER GALLERY
========================================================= */

function renderGallery() {

    galleryElement.innerHTML =
        "";


    photoCountElement.textContent =
        `Фото: ${photos.length}`;


    /*
     * Нет фотографий.
     */

    if (photos.length === 0) {

        emptyGalleryElement
            .classList
            .remove("hidden");

        return;

    }


    emptyGalleryElement
        .classList
        .add("hidden");


    /*
     * Создаём карточки.
     */

    photos.forEach(
        (photo, index) => {

            const item =
                document.createElement(
                    "div"
                );

            item.className =
                "gallery-item";


            const image =
                document.createElement(
                    "img"
                );


            image.src =
                photo.url;

            image.alt =
                `Фотография ${index + 1}`;

            image.loading =
                "lazy";


            /*
             * Открыть фотографию.
             */

            image.addEventListener(
                "click",
                () => {

                    openPhoto(index);

                }
            );


            /*
             * Удалить.
             */

            const deleteButton =
                document.createElement(
                    "button"
                );

            deleteButton.className =
                "delete-photo";

            deleteButton.type =
                "button";

            deleteButton.textContent =
                "🗑️";

            deleteButton.title =
                "Удалить фотографию";


            deleteButton.addEventListener(
                "click",
                event => {

                    event.stopPropagation();

                    deletePhoto(
                        photo
                    );

                }
            );


            item.appendChild(
                image
            );

            item.appendChild(
                deleteButton
            );


            galleryElement.appendChild(
                item
            );

        }
    );

}


/* =========================================================
   DELETE PHOTO
========================================================= */

async function deletePhoto(photo) {

    const confirmed =
        confirm(
            "Удалить эту фотографию?"
        );


    if (!confirmed) {
        return;
    }


    try {

        status(
            "🗑️ Удаление фотографии..."
        );


        const response =
            await fetch(
                `/api/photos/${encodeURIComponent(
                    photo.filename
                )}`,
                {
                    method: "DELETE"
                }
            );


        const data =
            await response.json();


        if (!response.ok) {

            throw new Error(
                data.detail ||
                "Не удалось удалить фото."
            );

        }


        status(
            "🗑️ Фото удалено."
        );


        await loadGallery();


    } catch (error) {

        console.error(
            "Delete error:",
            error
        );


        status(
            "❌ " + error.message
        );

    }

}


/* =========================================================
   OPEN PHOTO
========================================================= */

function openPhoto(index) {

    if (!photos.length) {
        return;
    }


    if (index < 0) {

        index =
            photos.length - 1;

    }


    if (
        index >=
        photos.length
    ) {

        index = 0;

    }


    currentPhotoIndex =
        index;


    const photo =
        photos[
            currentPhotoIndex
        ];


    modalImage.src =
        photo.url;


    modalInfo.textContent =
        `${currentPhotoIndex + 1} / ${photos.length}`;


    photoModal
        .classList
        .add("show");


    document.body.style.overflow =
        "hidden";

}


/* =========================================================
   CLOSE PHOTO
========================================================= */

function closePhoto() {

    photoModal
        .classList
        .remove("show");


    modalImage.src =
        "";


    document.body.style.overflow =
        "";

}


/* =========================================================
   NEXT PHOTO
========================================================= */

function showNextPhoto() {

    if (!photos.length) {
        return;
    }


    currentPhotoIndex++;


    if (
        currentPhotoIndex >=
        photos.length
    ) {

        currentPhotoIndex = 0;

    }


    openPhoto(
        currentPhotoIndex
    );

}


/* =========================================================
   PREVIOUS PHOTO
========================================================= */

function showPreviousPhoto() {

    if (!photos.length) {
        return;
    }


    currentPhotoIndex--;


    if (
        currentPhotoIndex < 0
    ) {

        currentPhotoIndex =
            photos.length - 1;

    }


    openPhoto(
        currentPhotoIndex
    );

}


/* =========================================================
   SLEEP
========================================================= */

function sleep(ms) {

    return new Promise(
        resolve =>
            setTimeout(
                resolve,
                ms
            )
    );

}


/* =========================================================
   ROBOT
========================================================= */

async function checkRobotCommand() {

    try {

        const response =
            await fetch(
                "/api/robot/status",
                {
                    cache: "no-store"
                }
            );


        if (!response.ok) {
            return;
        }


        const data =
            await response.json();


        if (
            data.capture === true &&
            !countdownRunning &&
            !pendingPhotoBlob
        ) {

            /*
             * Робот попросил сделать фото.
             */

            status(
                "🤖 Робот дал команду на фото."
            );


            /*
             * Если камера выключена —
             * включаем.
             */

            if (!stream) {

                await startCamera();

            }


            if (stream) {

                await startCountdown();

            }

        }

    } catch (error) {

        console.error(
            "Robot polling error:",
            error
        );

    }

}


/* =========================================================
   START ROBOT POLLING
========================================================= */

function startRobotPolling() {

    if (robotPolling) {
        return;
    }


    robotPolling =
        setInterval(
            checkRobotCommand,
            500
        );

}


/* =========================================================
   BUTTON EVENTS
========================================================= */

startCameraButton
    .addEventListener(
        "click",
        startCamera
    );


rotateCameraButton
    .addEventListener(
        "click",
        rotateCamera
    );


takePhotoButton
    .addEventListener(
        "click",
        takePhoto
    );


stopCameraButton
    .addEventListener(
        "click",
        stopCamera
    );


savePhotoButton
    .addEventListener(
        "click",
        savePhoto
    );


retakePhotoButton
    .addEventListener(
        "click",
        retakePhoto
    );


refreshGalleryButton
    .addEventListener(
        "click",
        loadGallery
    );


/* =========================================================
   MODAL EVENTS
========================================================= */

closeModalButton
    .addEventListener(
        "click",
        closePhoto
    );


prevPhotoButton
    .addEventListener(
        "click",
        event => {

            event.stopPropagation();

            showPreviousPhoto();

        }
    );


nextPhotoButton
    .addEventListener(
        "click",
        event => {

            event.stopPropagation();

            showNextPhoto();

        }
    );


/*
 * Клик по тёмному фону закрывает просмотр.
 */

photoModal.addEventListener(
    "click",
    event => {

        if (
            event.target ===
            photoModal
        ) {

            closePhoto();

        }

    }
);


/* =========================================================
   KEYBOARD
========================================================= */

document.addEventListener(
    "keydown",
    event => {

        if (
            !photoModal
                .classList
                .contains("show")
        ) {

            return;

        }


        if (
            event.key ===
            "Escape"
        ) {

            closePhoto();

        }


        if (
            event.key ===
            "ArrowLeft"
        ) {

            showPreviousPhoto();

        }


        if (
            event.key ===
            "ArrowRight"
        ) {

            showNextPhoto();

        }

    }
);


/* =========================================================
   SWIPE
========================================================= */

let touchStartX = 0;

let touchEndX = 0;


photoModal.addEventListener(
    "touchstart",
    event => {

        touchStartX =
            event
                .changedTouches[0]
                .screenX;

    },
    {
        passive: true
    }
);


photoModal.addEventListener(
    "touchend",
    event => {

        touchEndX =
            event
                .changedTouches[0]
                .screenX;


        const difference =
            touchEndX -
            touchStartX;


        if (
            Math.abs(difference) >
            50
        ) {

            if (
                difference < 0
            ) {

                showNextPhoto();

            } else {

                showPreviousPhoto();

            }

        }

    },
    {
        passive: true
    }
);


/* =========================================================
   INITIALIZATION
========================================================= */

async function init() {

    status(
        "🔄 Загружаем фотографии..."
    );


    await loadGallery();


    status(
        "✅ Готово. Включите камеру."
    );


    startRobotPolling();

}


init();