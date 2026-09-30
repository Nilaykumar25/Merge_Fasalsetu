"""
LOCAL VERSION of card_extractor.py
Same extraction pipeline (bs4 -> ShcHtmlExtractor -> CardInfoParser),
but persists to local_db (SQLite) instead of Spanner, and reads/writes
HTML via local storage.py instead of GCS.
"""

from card_info_parser import CardInfoParser
from extractor.shc_html_extractor import ShcHtmlExtractor
import storage
import local_db
import time


class LocalCardExtractor:
    """Pipeline between local_main.py and the html-extractor."""

    def __init__(self, card: dict, india_shape=None):
        self.card = card
        self.cols = []
        self.vals = []
        self.india_shape = india_shape

    def extract_card(self, overwrite) -> bool:
        t2 = time.time()

        file_path = self.get_html_file_path()
        local_db.incExtractAttempt(
            int(self.card['village_id']), self.card['sample'], int(self.card['sr_no'])
        )

        html_blob = self.get_html_blob(file_path)
        card_info = self.get_card_info(html_blob)
        parsed_card = self.parse_card(card_info)

        self.update_table()
        self.upload_json(file_path, parsed_card)

        t1 = t2
        t2 = time.time()
        print(f'extracted card in {t2 - t1:.2f}s')
        return True

    def get_html_file_path(self):
        return storage.getFilePath(
            self.card['state_id'], self.card['district_id'],
            self.card['mandal_id'], self.card['village_id'],
            self.card['sample'], self.card['sr_no']
        )

    def get_html_blob(self, html_file_path: str):
        return storage.downloadFile(html_file_path)

    def get_card_info(self, html_blob: str):
        return ShcHtmlExtractor(html_blob).extract()

    def parse_card(self, card_info):
        card_parser = CardInfoParser(card_info, india_shape=self.india_shape)
        soil_sample_details = card_parser.get_soil_sample_details()
        soil_tests = card_parser.get_soil_tests()
        recommendations = card_parser.get_recommendations()
        fertilizer_combinations = card_parser.get_fertilizer_combinations()

        self.cols = ['SampleNo', 'SrNo', 'VillageId', 'SubDistrictId', 'DistrictId', 'StateId']
        self.vals = [
            self.card.get('sample'), self.card.get('sr_no'),
            self.card.get('village_id'), self.card.get('mandal_id'),
            self.card.get('district_id'), self.card.get('state_id')
        ]

        fields = soil_sample_details.ListFields()
        for field_descriptor, value in fields:
            self.cols.append(field_descriptor.name)
            self.vals.append(value)

        for parameter, soil_test in soil_tests.items():
            fields = soil_test.ListFields()
            for field_descriptor, value in fields:
                self.cols.append(f'{parameter}_{field_descriptor.name}')
                self.vals.append(value)

        self.cols.append('error_log')
        self.vals.append(card_parser.get_error_log())

        self.cols.append('recommendations')
        self.vals.append(recommendations)
        self.cols.append('fertilizer_combinations')
        self.vals.append(fertilizer_combinations)

        return card_parser.get_full_card()

    def update_table(self):
        local_db.insert_card_info(self.cols, self.vals)

    def upload_json(self, file_path, parsed_card):
        storage.uploadParsedCard(file_path, parsed_card)

    def is_card_extracted(self, overwrite=False):
        if overwrite:
            return False
        row = local_db.get_card_extract_status(
            int(self.card['village_id']), self.card['sample'], int(self.card['sr_no'])
        )
        if row:
            return bool(row[0])
        return False
