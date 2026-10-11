from fastapi import FastAPI

app = FastAPI(title="CHANGE_ME")


@app.get("/health")
def health():
    return {"status": "ok"}
