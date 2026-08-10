"""Smoke tests cho giao diện web tĩnh."""


def test_home_serves_chat_ui(client):
    response = client.get("/")

    assert response.status_code == 200
    assert "text/html" in response.headers["content-type"]
    assert "Day 12 Chat" in response.text
    assert 'id="chatForm"' in response.text


def test_static_assets_are_available(client):
    css = client.get("/static/styles.css")
    javascript = client.get("/static/app.js")

    assert css.status_code == 200
    assert "text/css" in css.headers["content-type"]
    assert javascript.status_code == 200
    assert "javascript" in javascript.headers["content-type"]
