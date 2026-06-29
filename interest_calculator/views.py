from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST

from .services import calculate_savings_projection
from .validation import validate_projection_inputs


@csrf_exempt
@require_POST
def interest_data(request):
    validation = validate_projection_inputs(request.body)

    if not validation.is_valid:
        return JsonResponse({"errors": validation.errors}, status=400)

    projection = calculate_savings_projection(**validation.data)

    return JsonResponse({
        "monthly_data": [
            {"month": p.month, "year": p.year, "balance": p.balance}
            for p in projection.monthly_data
        ],
        "final_balance": projection.final_balance,
    })
