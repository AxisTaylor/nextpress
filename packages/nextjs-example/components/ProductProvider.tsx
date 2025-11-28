'use client';

import {
  createContext,
  useContext,
  useEffect,
  useReducer
} from 'react';

type ProductVariation = {
  id: string;
  databaseId: number;
  name: string;
  price: number;
};

type Product = {
  id: string;
  databaseId: number;
  name: string;
  price: number;
  type: "SIMPLE" | "VARIABLE";
  variations?: ProductVariation[];
  description: string;
  shortDescription: string;
};

export interface ProductContext {
  product: Product|null;
  selectedVariation?: ProductVariation;
  get<T = unknown>(field: keyof Product|keyof ProductVariation): T;
  selectVariation(variationId: number): void;
}

const initialState = {
  product: null,
  selectedVariation: undefined,
  get: (field: keyof Product|keyof ProductVariation) => null as any,
  selectVariation: (variationId: number) => {},
};
const productContext = createContext<ProductContext>(initialState);

export const useProduct = () => useContext(productContext);

type ProductAction = {
  type: 'SET_PRODUCT';
  payload: Product;
} | {
  type: 'SELECT_VARIATION';
  payload: number;
};

function reducer(state: ProductContext, action: ProductAction) {
  switch (action.type) {
    case 'SET_PRODUCT':
      return {
        ...state,
        product: action.payload,
      };
    case 'SELECT_VARIATION':
      return {
        ...state,
        selectedVariation: state.product?.variations?.find(variation => variation.databaseId === action.payload),
      };
    default:
      return state;
  }
}

export interface ProductProviderProps {
  product: Product;
  children: React.ReactNode;
}

const { Provider } = productContext;
export function ProductProvider({ product, children }: ProductProviderProps) {
  const [state, dispatch] = useReducer(reducer, initialState);

  useEffect(() => {
    dispatch({ type: 'SET_PRODUCT', payload: product });
  }, [product]);

  const store = {
    ...state,
    get<T = unknown>(field: keyof ProductVariation|keyof Product) {
      if (!state.product) return null as T;

      if (state.selectedVariation) {
        return state.selectedVariation[field as keyof ProductVariation] as T;
      }
      return state.product[field as keyof Product] as T;
    },
    selectVariation(variationId: number) {
      dispatch({ type: 'SELECT_VARIATION', payload: variationId });
    },
  }

  return (
    <Provider value={store}>
      {children}
    </Provider>
  );
}