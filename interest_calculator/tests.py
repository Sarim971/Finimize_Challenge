import json
from django.test import TestCase

from .services import calculate_savings_projection, PROJECTION_YEARS
from .validation import validate_projection_inputs


class CalculateSavingsProjectionTests(TestCase):
    def test_returns_correct_number_of_data_points(self):
        projection = calculate_savings_projection(1000, 100, 5.0)
        self.assertEqual(len(projection.monthly_data), PROJECTION_YEARS * 12)

    def test_zero_interest_rate_is_simple_accumulation(self):
        """balance = initial + deposit * months when rate is 0."""
        projection = calculate_savings_projection(1000, 100, 0.0)
        expected = 1000 + 100 * (PROJECTION_YEARS * 12)
        self.assertAlmostEqual(projection.final_balance, expected, places=2)

    def test_zero_deposit_compounds_only_initial_amount(self):
        projection = calculate_savings_projection(1000, 0, 12.0)
        monthly_rate = 12.0 / 12 / 100
        expected = 1000 * (1 + monthly_rate) ** (PROJECTION_YEARS * 12)
        self.assertAlmostEqual(projection.final_balance, expected, delta=1.0)

    def test_all_zero_inputs_stay_at_zero(self):
        projection = calculate_savings_projection(0, 0, 0.0)
        self.assertEqual(projection.final_balance, 0.0)
        self.assertTrue(all(p.balance == 0.0 for p in projection.monthly_data))

    def test_balance_increases_monotonically(self):
        projection = calculate_savings_projection(500, 50, 3.0)
        balances = [p.balance for p in projection.monthly_data]
        for i in range(1, len(balances)):
            self.assertGreater(balances[i], balances[i - 1])

    def test_year_assignment(self):
        projection = calculate_savings_projection(1000, 0, 0.0)
        self.assertEqual(projection.monthly_data[11].year, 1)   # month 12 → year 1
        self.assertEqual(projection.monthly_data[12].year, 2)   # month 13 → year 2

    def test_final_balance_matches_last_data_point(self):
        projection = calculate_savings_projection(2000, 200, 7.0)
        self.assertEqual(projection.final_balance, projection.monthly_data[-1].balance)

    def test_high_interest_rate_produces_larger_balance(self):
        low = calculate_savings_projection(1000, 100, 2.0)
        high = calculate_savings_projection(1000, 100, 10.0)
        self.assertGreater(high.final_balance, low.final_balance)

    def test_higher_initial_amount_produces_larger_balance(self):
        small = calculate_savings_projection(1000, 100, 5.0)
        large = calculate_savings_projection(50_000, 100, 5.0)
        self.assertGreater(large.final_balance, small.final_balance)


class ValidateProjectionInputsTests(TestCase):
    def _payload(self, **overrides) -> bytes:
        data = {"initial_amount": 1000, "monthly_deposit": 200, "annual_interest_rate": 5.0}
        data.update(overrides)
        return json.dumps(data).encode()

    def test_valid_payload_returns_floats(self):
        result = validate_projection_inputs(self._payload())
        self.assertTrue(result.is_valid)
        self.assertEqual(result.data["initial_amount"], 1000.0)
        self.assertEqual(result.data["monthly_deposit"], 200.0)
        self.assertEqual(result.data["annual_interest_rate"], 5.0)

    def test_missing_field_is_reported(self):
        payload = json.dumps({"initial_amount": 100, "monthly_deposit": 50}).encode()
        result = validate_projection_inputs(payload)
        self.assertFalse(result.is_valid)
        self.assertIn("annual_interest_rate", result.errors)

    def test_multiple_invalid_fields_all_reported(self):
        result = validate_projection_inputs(
            self._payload(initial_amount=-1, monthly_deposit=-50)
        )
        self.assertFalse(result.is_valid)
        self.assertIn("initial_amount", result.errors)
        self.assertIn("monthly_deposit", result.errors)

    def test_negative_value_is_rejected(self):
        result = validate_projection_inputs(self._payload(initial_amount=-1))
        self.assertFalse(result.is_valid)
        self.assertIn("initial_amount", result.errors)

    def test_interest_rate_above_100_is_rejected(self):
        result = validate_projection_inputs(self._payload(annual_interest_rate=101))
        self.assertFalse(result.is_valid)
        self.assertIn("annual_interest_rate", result.errors)

    def test_all_zero_values_are_valid(self):
        result = validate_projection_inputs(
            self._payload(initial_amount=0, monthly_deposit=0, annual_interest_rate=0)
        )
        self.assertTrue(result.is_valid)

    def test_boundary_values_are_valid(self):
        """Max allowed values for each field must pass validation."""
        result = validate_projection_inputs(
            self._payload(initial_amount=10_000_000, monthly_deposit=100_000, annual_interest_rate=100)
        )
        self.assertTrue(result.is_valid)

    def test_invalid_json_is_rejected(self):
        result = validate_projection_inputs(b"not-json")
        self.assertFalse(result.is_valid)
        self.assertIn("body", result.errors)

    def test_non_object_json_is_rejected(self):
        result = validate_projection_inputs(b"[1, 2, 3]")
        self.assertFalse(result.is_valid)
        self.assertIn("body", result.errors)

    def test_string_value_is_rejected(self):
        result = validate_projection_inputs(self._payload(initial_amount="abc"))
        self.assertFalse(result.is_valid)
        self.assertIn("initial_amount", result.errors)

    def test_boolean_is_rejected(self):
        result = validate_projection_inputs(self._payload(initial_amount=True))
        self.assertFalse(result.is_valid)

    def test_float_values_are_accepted(self):
        result = validate_projection_inputs(self._payload(annual_interest_rate=4.75))
        self.assertTrue(result.is_valid)
        self.assertAlmostEqual(result.data["annual_interest_rate"], 4.75)


class InterestDataViewTests(TestCase):
    URL = "/interest-data/"

    def _post(self, payload: dict) -> object:
        return self.client.post(
            self.URL,
            data=json.dumps(payload),
            content_type="application/json",
        )

    def test_valid_request_returns_200(self):
        response = self._post({"initial_amount": 1000, "monthly_deposit": 100, "annual_interest_rate": 5})
        self.assertEqual(response.status_code, 200)

    def test_response_shape(self):
        response = self._post({"initial_amount": 1000, "monthly_deposit": 100, "annual_interest_rate": 5})
        body = response.json()
        self.assertIn("monthly_data", body)
        self.assertIn("final_balance", body)
        self.assertEqual(len(body["monthly_data"]), PROJECTION_YEARS * 12)

    def test_monthly_data_point_shape(self):
        response = self._post({"initial_amount": 500, "monthly_deposit": 50, "annual_interest_rate": 3})
        first = response.json()["monthly_data"][0]
        self.assertIn("month", first)
        self.assertIn("year", first)
        self.assertIn("balance", first)

    def test_first_data_point_is_month_1(self):
        response = self._post({"initial_amount": 500, "monthly_deposit": 50, "annual_interest_rate": 3})
        first = response.json()["monthly_data"][0]
        self.assertEqual(first["month"], 1)
        self.assertEqual(first["year"], 1)

    def test_final_balance_matches_last_monthly_data_point(self):
        response = self._post({"initial_amount": 1000, "monthly_deposit": 100, "annual_interest_rate": 5})
        body = response.json()
        self.assertEqual(body["final_balance"], body["monthly_data"][-1]["balance"])

    def test_invalid_payload_returns_400_with_errors(self):
        response = self._post({"initial_amount": -100, "monthly_deposit": 50, "annual_interest_rate": 5})
        self.assertEqual(response.status_code, 400)
        self.assertIn("errors", response.json())

    def test_multiple_invalid_fields_all_appear_in_errors(self):
        response = self._post({"initial_amount": -1, "monthly_deposit": -1, "annual_interest_rate": 5})
        errors = response.json()["errors"]
        self.assertIn("initial_amount", errors)
        self.assertIn("monthly_deposit", errors)

    def test_get_request_returns_405(self):
        response = self.client.get(self.URL)
        self.assertEqual(response.status_code, 405)

    def test_empty_body_returns_400(self):
        response = self.client.post(self.URL, data="", content_type="application/json")
        self.assertEqual(response.status_code, 400)

    def test_zero_interest_rate_accepted(self):
        response = self._post({"initial_amount": 1000, "monthly_deposit": 100, "annual_interest_rate": 0})
        self.assertEqual(response.status_code, 200)

    def test_all_zero_inputs_accepted(self):
        response = self._post({"initial_amount": 0, "monthly_deposit": 0, "annual_interest_rate": 0})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["final_balance"], 0.0)
