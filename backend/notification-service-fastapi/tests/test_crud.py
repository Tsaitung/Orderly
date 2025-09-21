from fastapi.testclient import TestClient
from app.main import app


def test_create_and_list_notifications():
    client = TestClient(app)
    payload = {
        "userId": "00000000-0000-0000-0000-000000000009",
        "type": "system",
        "title": "Hello",
        "message": "World",
        "priority": "medium"
    }
    r = client.post('/notifications', json=payload)
    assert r.status_code == 201
    body = r.json()
    assert body.get('success') is True
    nid = body.get('data', {}).get('id')
    assert nid

    r2 = client.get('/notifications')
    assert r2.status_code == 200
    listing = r2.json()
    assert listing.get('count') >= 1

    r3 = client.patch(f'/notifications/{nid}/read')
    assert r3.status_code == 200
    read = r3.json().get('data', {})
    assert read.get('read') is True
