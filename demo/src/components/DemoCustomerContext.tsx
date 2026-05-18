import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { defaultPersona, findPersonaById, personas } from "../lib/personas";
import type { DemoCustomer } from "../types";

interface DemoCustomerContextValue {
  customer: DemoCustomer;
  customers: DemoCustomer[];
  setCustomerId: (id: string) => void;
}

const DemoCustomerContext = createContext<DemoCustomerContextValue | null>(null);

export function DemoCustomerProvider({ children }: { children: ReactNode }) {
  const [customerId, setCustomerIdState] = useState(defaultPersona.id);

  useEffect(() => {
    const storedId = window.localStorage.getItem("sepetiq-demo-customer");
    const searchParams = new URLSearchParams(window.location.search);
    const queryId = searchParams.get("user");
    const nextId = queryId ?? storedId ?? defaultPersona.id;

    setCustomerIdState(findPersonaById(nextId).id);
  }, []);

  const setCustomerId = (id: string) => {
    const nextCustomer = findPersonaById(id);
    window.localStorage.setItem("sepetiq-demo-customer", nextCustomer.id);
    setCustomerIdState(nextCustomer.id);
  };

  const value = useMemo(
    () => ({
      customer: findPersonaById(customerId),
      customers: personas,
      setCustomerId,
    }),
    [customerId],
  );

  return (
    <DemoCustomerContext.Provider value={value}>
      {children}
    </DemoCustomerContext.Provider>
  );
}

export function useDemoCustomer() {
  const value = useContext(DemoCustomerContext);

  if (!value) {
    throw new Error("useDemoCustomer must be used inside DemoCustomerProvider");
  }

  return value;
}
