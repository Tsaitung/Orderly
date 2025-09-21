from fastapi.testclient import TestClient
from app.main import app


def test_create_and_list_invoice():
    client = TestClient(app)
    payload = {
        "organizationId": "00000000-0000-0000-0000-000000000001",
        "totalAmount": 100,
        "subtotal": 90,
        "taxAmount": 10,
        "status": "draft"
    }
    r = client.post('/invoices', json=payload)
    assert r.status_code == 201
    data = r.json()
    assert data.get('success') is True
    inv = data.get('data')
    assert inv and inv.get('invoiceNumber')

    r2 = client.get('/invoices')
    assert r2.status_code == 200
    listing = r2.json()
    assert listing.get('count') >= 1
