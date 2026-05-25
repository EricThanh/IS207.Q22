import React, { createContext, useContext, useEffect, useMemo, useReducer } from "react";
import { loadCart, saveCart } from "./cartStorage";
import { useAuth } from "./AuthContext";

const CartContext = createContext(null);

function calcTotals(items) {
    const totalQty = items.reduce((sum, it) => sum + it.qty, 0);
    const totalPrice = items.reduce((sum, it) => sum + it.qty * it.price, 0);
    return { totalQty, totalPrice };
}

function cartReducer(state, action) {
    switch (action.type) {
        case "INIT": {
            return { ...state, items: action.payload.items, loadedScope: action.payload.scope };
        }

        case "ADD": {
            const { item, qty = 1 } = action.payload;
            const exists = state.items.find((x) => x.id === item.id);

            let nextItems;
            if (exists) {
                nextItems = state.items.map((x) =>
                    x.id === item.id
                        ? { ...x, qty: Math.min(x.qty + qty, x.stock ?? Infinity) }
                        : x
                );
            } else {
                nextItems = [
                    ...state.items,
                    {
                        id: item.id,
                        seller_id: item.seller_id,
                        name: item.name,
                        price: Number(item.price) || 0,
                        image_url: item.image_url || "",
                        stock: item.stock ?? null,
                        qty: Math.min(qty, item.stock ?? qty),
                    },
                ];
            }

            return { ...state, items: nextItems };
        }

        case "UPDATE_QTY": {
            const { id, qty } = action.payload;
            const nextItems = state.items
                .map((x) => {
                    if (x.id !== id) return x;
                    const max = x.stock ?? Infinity;
                    const nextQty = Math.max(1, Math.min(Number(qty) || 1, max));
                    return { ...x, qty: nextQty };
                })
                .filter((x) => x.qty > 0);
            return { ...state, items: nextItems };
        }

        case "REMOVE": {
            const id = action.payload;
            return { ...state, items: state.items.filter((x) => x.id !== id) };
        }

        case "CLEAR": {
            return { ...state, items: [] };
        }

        default:
            return state;
    }
}

export function CartProvider({ children }) {
    const { user, ready } = useAuth();
    const cartScope = user?.id ? `user_${user.id}` : "guest";
    const [state, dispatch] = useReducer(cartReducer, { items: [], loadedScope: null });

    // init from localStorage
    useEffect(() => {
        if (!ready) return;
        dispatch({
            type: "INIT",
            payload: {
                items: loadCart(cartScope),
                scope: cartScope,
            },
        });
    }, [cartScope, ready]);

    // persist to localStorage whenever items change
    useEffect(() => {
        if (!ready || state.loadedScope !== cartScope) return;
        saveCart(cartScope, state.items);
    }, [cartScope, ready, state.items, state.loadedScope]);

    const totals = useMemo(() => calcTotals(state.items), [state.items]);

    const api = useMemo(
        () => ({
            items: state.items,
            totalQty: totals.totalQty,
            totalPrice: totals.totalPrice,
            addItem: (item, qty = 1) => dispatch({ type: "ADD", payload: { item, qty } }),
            updateQty: (id, qty) => dispatch({ type: "UPDATE_QTY", payload: { id, qty } }),
            removeItem: (id) => dispatch({ type: "REMOVE", payload: id }),
            clearCart: () => dispatch({ type: "CLEAR" }),
        }),
        [state.items, totals.totalQty, totals.totalPrice]
    );

    return <CartContext.Provider value={api}>{children}</CartContext.Provider>;
}

export function useCart() {
    const ctx = useContext(CartContext);
    if (!ctx) throw new Error("useCart must be used within CartProvider");
    return ctx;
}
