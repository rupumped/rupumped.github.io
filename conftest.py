import pytest

def pytest_configure(config):
    config.addinivalue_line(
        "markers", "network: marks tests that make external network requests (skip with -k 'not network')"
    )
    config.addinivalue_line(
        "markers", "browser: marks tests that launch a headless browser (skip with -k 'not browser')"
    )
