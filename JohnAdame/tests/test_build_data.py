import json
import os
import unittest
from scripts.build_data import build_dataset, ensure_source_workbook, write_outputs


class TestBuildData(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.xlsx_path = ensure_source_workbook("data/source_workbook.xlsx")
        cls.data = build_dataset(cls.xlsx_path)

    def test_meta_and_top_level_counts(self):
        meta = self.data["meta"]
        self.assertEqual(meta["totalEntries"], 402)
        self.assertEqual(meta["totalStops"], 380)
        self.assertEqual(meta["totalMovieViewings"], 303)
        self.assertEqual(meta["totalUniqueMovies"], 278)
        self.assertEqual(meta["totalNotes"], 137)
        self.assertEqual(meta["totalLocations"], 21)
        self.assertEqual(meta["dateRange"], ["1942-01-06", "1945-11-12"])
        self.assertEqual(len(self.data["entries"]), 402)
        self.assertEqual(len(self.data["stops"]), 380)
        self.assertEqual(len(self.data["chapters"]), 4)

    def test_chronological_monotonicity_and_port_moresby_date_fix(self):
        dates = [e["date"] for e in self.data["entries"]]
        self.assertEqual(dates, sorted(dates), "All 402 entries must be monotonically non-decreasing in date")
        row_128 = next(e for e in self.data["entries"] if e["rowNumber"] == 128)
        self.assertEqual(row_128["location"], "Port Moresby, PNG")
        self.assertEqual(row_128["note"], "Arrive Port Moresby")
        self.assertEqual(row_128["date"], "1944-01-07")

    def test_all_303_movie_viewings_resolve_including_special_cases(self):
        movie_entries = [e for e in self.data["entries"] if e["movieNumber"] is not None]
        self.assertEqual(len(movie_entries), 303)
        for e in movie_entries:
            self.assertIn(e["movieKey"], self.data["movies"], f"Unresolved movie on row {e['rowNumber']}: {e['movieTitle']}")
        # Row 235: Excel serial 16412.0 -> "December 7th" (1943)
        row_235 = next(e for e in self.data["entries"] if e["rowNumber"] == 235)
        self.assertEqual(row_235["movieTitle"], "December 7th")
        self.assertEqual(self.data["movies"][row_235["movieKey"]]["year"], "1943")
        # Row 91: "Prison Mutiny" (1943)
        row_91 = next(e for e in self.data["entries"] if e["rowNumber"] == 91)
        self.assertEqual(row_91["movieTitle"], "Prison Mutiny")
        self.assertEqual(self.data["movies"][row_91["movieKey"]]["year"], "1943")
        # Case-insensitive match e.g. "Arsenic and old Lace" -> "Arsenic and Old Lace"
        row_166 = next(e for e in self.data["entries"] if e["rowNumber"] == 166)
        self.assertTrue(self.data["movies"][row_166["movieKey"]]["posterUrl"].startswith("https://"))

    def test_omdb_shifted_columns_and_na_poster(self):
        joe = self.data["movies"]["a guy named joe"]
        self.assertEqual(joe["imdbId"], "tt0035959")
        self.assertEqual(joe["imdbRating"], "7.0")
        men = self.data["movies"]["3 men in white"]
        self.assertEqual(men["imdbId"], "tt0037373")
        self.assertEqual(men["imdbRating"], "6.0")
        reckless = self.data["movies"]["reckless age"]
        self.assertEqual(reckless["posterUrl"], "")

    def test_pacific_ocean_interpolation_stays_in_pacific_basin(self):
        interpolated = [e for e in self.data["entries"] if e["isInterpolated"]]
        self.assertEqual(len(interpolated), 16)
        for e in interpolated:
            self.assertGreaterEqual(e["lngUnwrapped"], -232.0)
            self.assertLessEqual(e["lngUnwrapped"], -89.0)
        # Row 110 ("Davi Jonas", 1943-11-19) is between Laurel Field (31.67) and Brisbane (-27.47)
        row_110 = next(e for e in self.data["entries"] if e["rowNumber"] == 110)
        self.assertLess(abs(row_110["lat"]), 15.0)
        # Rows 383..396 ("Out at Sea", Okinawa to Portland) move eastward in unwrapped coords (-232 -> -122.68)
        sea_lngs = [e["lngUnwrapped"] for e in self.data["entries"] if 383 <= e["rowNumber"] <= 396]
        self.assertEqual(sea_lngs, sorted(sea_lngs))

    def test_same_day_grouping_preserves_multiple_movies_and_notes(self):
        stop_feb_09 = next(s for s in self.data["stops"] if s["date"] == "1943-02-09")
        self.assertEqual(stop_feb_09["notes"], ["Hospitalized Camp Livingston", "Tonsillectomy"])
        stop_dec_26 = next(s for s in self.data["stops"] if s["date"] == "1943-12-26")
        self.assertEqual(len(stop_dec_26["movies"]), 2)

    def test_write_outputs_creates_json_and_js_files(self):
        write_outputs(self.data, "data/journal.json", "data/journal-data.js")
        self.assertTrue(os.path.exists("data/journal.json"))
        self.assertTrue(os.path.exists("data/journal-data.js"))
        with open("data/journal.json", "r", encoding="utf-8") as f:
            parsed = json.load(f)
        self.assertEqual(parsed["meta"]["totalStops"], 380)
        with open("data/journal-data.js", "r", encoding="utf-8") as f:
            js_text = f.read()
        self.assertTrue(js_text.startswith("window.JOHN_ADAME_DATA = "))
