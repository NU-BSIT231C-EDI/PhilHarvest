<?php

namespace App\Http\Controllers\Api\Edi;

use App\Http\Controllers\Controller;
use App\Models\TradingPartner;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TradingPartnerController extends Controller
{
    public function index(): JsonResponse
    {
        $partners = TradingPartner::orderBy('label')->get()
            ->map(fn (TradingPartner $p) => $this->format($p));

        return response()->json($partners);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $this->validated($request);
        $partner = TradingPartner::create($data);

        return response()->json($this->format($partner), 201);
    }

    public function show(TradingPartner $tradingPartner): JsonResponse
    {
        return response()->json($this->format($tradingPartner));
    }

    public function update(Request $request, TradingPartner $tradingPartner): JsonResponse
    {
        $data = $this->validated($request, forUpdate: true);
        $tradingPartner->update($data);

        return response()->json($this->format($tradingPartner->fresh()));
    }

    public function destroy(TradingPartner $tradingPartner): JsonResponse
    {
        $tradingPartner->delete();

        return response()->json(null, 204);
    }

    public function archive(TradingPartner $tradingPartner): JsonResponse
    {
        $tradingPartner->update(['is_archived' => true]);

        return response()->json($this->format($tradingPartner->fresh()));
    }

    public function unarchive(TradingPartner $tradingPartner): JsonResponse
    {
        $tradingPartner->update(['is_archived' => false]);

        return response()->json($this->format($tradingPartner->fresh()));
    }

    // -------------------------------------------------------------------------

    private function validated(Request $request, bool $forUpdate = false): array
    {
        $tokenRule = $forUpdate ? 'sometimes|required|string' : 'required|string';

        return $request->validate([
            'label'            => ($forUpdate ? 'sometimes|' : '') . 'required|string|max:255',
            'isa_receiver_id'  => ($forUpdate ? 'sometimes|' : '') . 'required|string|max:15',
            'company_name'     => ($forUpdate ? 'sometimes|' : '') . 'required|string|max:35',
            'edi_role'         => ($forUpdate ? 'sometimes|' : '') . 'required|in:BY,SE,SF,ST',
            'address_line_1'   => ($forUpdate ? 'sometimes|' : '') . 'required|string|max:55',
            'address_line_2'   => 'nullable|string|max:55',
            'city'             => ($forUpdate ? 'sometimes|' : '') . 'required|string|max:30',
            'state'            => 'nullable|string|max:3',
            'postal_code'      => ($forUpdate ? 'sometimes|' : '') . 'required|string|max:15',
            'country'          => ($forUpdate ? 'sometimes|' : '') . 'required|string|size:2',
            'po_number_format' => ($forUpdate ? 'sometimes|' : '') . 'required|string|max:255',
            'default_currency' => ($forUpdate ? 'sometimes|' : '') . 'required|string|size:3',
            'api_endpoint'     => ($forUpdate ? 'sometimes|' : '') . 'required|url',
            'auth_token'       => $tokenRule,
            'excluded_skus'    => 'nullable|array',
            'excluded_skus.*'  => 'string',
        ]);
    }

    private function format(TradingPartner $p): array
    {
        $token = $p->auth_token ?? '';
        $masked = strlen($token) > 4
            ? str_repeat('•', max(strlen($token) - 4, 4)) . substr($token, -4)
            : str_repeat('•', strlen($token));

        return [
            'id'               => $p->id,
            'label'            => $p->label,
            'isa_receiver_id'  => $p->isa_receiver_id,
            'company_name'     => $p->company_name,
            'edi_role'         => $p->edi_role,
            'address_line_1'   => $p->address_line_1,
            'address_line_2'   => $p->address_line_2,
            'city'             => $p->city,
            'state'            => $p->state,
            'postal_code'      => $p->postal_code,
            'country'          => $p->country,
            'po_number_format' => $p->po_number_format,
            'default_currency' => $p->default_currency,
            'api_endpoint'     => $p->api_endpoint,
            'auth_token'       => $token,
            'auth_token_masked' => $masked,
            'excluded_skus'    => $p->excluded_skus ?? [],
            'is_archived'      => (bool) ($p->is_archived ?? false),
            'n1_segments'      => $p->toEdiN1Loop(),
            'created_at'       => $p->created_at,
            'updated_at'       => $p->updated_at,
        ];
    }
}
