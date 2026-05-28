<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Product;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class ProductController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Product::query();

        if ($request->has('active')) {
            $query->where('is_active', filter_var($request->active, FILTER_VALIDATE_BOOLEAN));
        }

        if ($request->filled('category')) {
            $query->where('category', $request->category);
        }

        if ($request->filled('search')) {
            $term = $request->search;
            $query->where(function ($q) use ($term) {
                $q->where('name', 'like', "%{$term}%")
                  ->orWhere('sku', 'like', "%{$term}%")
                  ->orWhere('description', 'like', "%{$term}%");
            });
        }

        $perPage = min((int) ($request->per_page ?? 20), 100);
        $products = $query->orderBy('name')->paginate($perPage);

        return response()->json($products);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'sku'              => 'required|string|max:100|unique:products,sku',
            'name'             => 'required|string|max:255',
            'description'      => 'nullable|string',
            'category'         => 'nullable|string|max:100',
            'unit_price'       => 'required|numeric|min:0',
            'unit_of_measure'  => 'nullable|string|max:10',
            'stock_quantity'   => 'nullable|integer|min:0',
            'reorder_point'    => 'nullable|integer|min:0',
            'seller_name'      => 'nullable|string|max:255',
            'weight_kg'        => 'nullable|numeric|min:0',
            'image_url'        => 'nullable|url|max:500',
            'is_active'        => 'nullable|boolean',
        ]);

        $product = Product::create($data);

        return response()->json($product, 201);
    }

    public function show(Product $product): JsonResponse
    {
        return response()->json($product);
    }

    public function update(Request $request, Product $product): JsonResponse
    {
        $data = $request->validate([
            'sku'              => ['sometimes', 'required', 'string', 'max:100', Rule::unique('products', 'sku')->ignore($product->id)],
            'name'             => 'sometimes|required|string|max:255',
            'description'      => 'nullable|string',
            'category'         => 'nullable|string|max:100',
            'unit_price'       => 'sometimes|required|numeric|min:0',
            'unit_of_measure'  => 'nullable|string|max:10',
            'stock_quantity'   => 'nullable|integer|min:0',
            'reorder_point'    => 'nullable|integer|min:0',
            'seller_name'      => 'nullable|string|max:255',
            'weight_kg'        => 'nullable|numeric|min:0',
            'image_url'        => 'nullable|url|max:500',
            'is_active'        => 'nullable|boolean',
        ]);

        $product->update($data);

        return response()->json($product);
    }

    public function destroy(Product $product): JsonResponse
    {
        $product->delete();

        return response()->json(['message' => 'Product deleted.']);
    }
}
