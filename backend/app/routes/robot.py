from fastapi import APIRouter

router = APIRouter(tags=["robot"])

# Флаг: пришла ли команда сделать фото
capture_requested = False


@router.post("/capture")
def request_capture():
    global capture_requested

    capture_requested = True

    return {
        "success": True,
        "message": "Команда на создание фото получена",
    }


@router.get("/status")
def get_status():
    global capture_requested

    status = capture_requested

    # После того как браузер получил команду,
    # следующий запрос уже не должен получать её повторно.
    capture_requested = False

    return {
        "capture": status,
    }