"""
LOCAL VERSION of utils.py
Original required google.cloud.logging even locally (behind a RUN_LOCALLY flag
that only changed the log *sink*, not whether the library was imported).
This version has zero GCP dependency, period.
"""

import logging

logging.basicConfig(format='%(levelname)s:%(message)s', level=logging.INFO)
logger = logging.getLogger('shc_scraper')


def logText(text):
    print(text)
    logger.info(text)
