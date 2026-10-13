from unittest.mock import patch

from lyrflow import web_server


def client():
    return web_server.app.test_client()


def test_remote_peer_and_origin_rejected():
    assert client().get('/api/song-list', environ_overrides={'REMOTE_ADDR':'198.51.100.2'}).status_code == 403
    assert client().get('/api/song-list', headers={'Origin':'https://attacker.example'}).status_code == 403


def test_write_header_required_and_title_bounded():
    assert client().post('/api/process-song', json={'title':'Synthetic','artist':'Fixture'}).status_code == 403
    response=client().post('/api/process-song', json={'title':'x'*201,'artist':'Fixture'}, headers={'X-Lyrflow-Client':'local-console'})
    assert response.status_code == 400


def test_body_size_limit():
    response=client().post('/api/process-song', data='x'*16001, content_type='application/json', headers={'X-Lyrflow-Client':'local-console'})
    assert response.status_code == 413


def test_job_capacity_never_submits_provider_work():
    with web_server._jobs_lock:
        saved=web_server._jobs.copy()
        web_server._jobs.clear()
        web_server._jobs.update({str(i):{'status':'running'} for i in range(4)})
    try:
        with patch.object(web_server._executor,'submit') as submit:
            response=client().post('/api/process-song', json={'title':'Synthetic','artist':'Fixture'}, headers={'X-Lyrflow-Client':'local-console'})
            assert response.status_code == 429
            submit.assert_not_called()
    finally:
        with web_server._jobs_lock:
            web_server._jobs.clear()
            web_server._jobs.update(saved)
