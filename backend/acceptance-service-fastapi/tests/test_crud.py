from fastapi.testclient import TestClient
from app.main import app


def test_create_and_list_acceptance():
    client = TestClient(app)
    payload = {
        "orderId": "00000000-0000-0000-0000-000000000001",
        "restaurantId": "00000000-0000-0000-0000-000000000002",
        "supplierId": "00000000-0000-0000-0000-000000000003",
        "items": [
            {
                "productName": "Test",
                "productCode": "T-1",
                "deliveredQty": 1,
                "acceptedQty": 1
            }
        ]
    }
    r = client.post('/acceptance', json=payload)
    assert r.status_code == 201
    data = r.json()
    assert data.get('success') is True
    ac = data.get('data')
    assert ac and ac.get('id')

    r2 = client.get('/acceptance')
    assert r2.status_code == 200
    listing = r2.json()
    assert listing.get('count') >= 1
