import { createContext, useContext, useState, type ReactNode } from 'react';

import { feedKey, useWarehouse } from './WarehouseContext';

import { useLocations } from './LocationsContext';

export interface BatchFeedPlan {
  key: string;
  batchId: string;
  locationId: string;
  feedTypeId: string;
  feedTypeName: string;
  recipeId: string;
  recipeName: string;
  gramsPerBird: number;
  updatedAt: string;
}

export type FeedRequestStatus = 'pending' | 'approved' | 'rejected';

export interface FeedRequest {
  id: string;
  date: string;
  batchId: string;
  batchCode: string;
  locationId: string;
  locationName: string;
  feedTypeId: string;
  feedTypeName: string;
  recipeId: string;
  recipeName: string;
  quantity: number;
  note: string;
  status: FeedRequestStatus;
  processedAt?: string;
  responseNote?: string;
}

interface FeedPlanningState {
  plans: BatchFeedPlan[];
  requests: FeedRequest[];
}

interface FeedPlanningContextValue extends FeedPlanningState {
  getPlan: (batchId: string, locationId: string) => BatchFeedPlan | undefined;

  savePlan: (plan: BatchFeedPlan) => void;

  sendRequest: (
    request: Omit<FeedRequest, 'id' | 'status' | 'processedAt' | 'responseNote'>
  ) => void;

  approveRequest: (id: string) => void;

  rejectRequest: (id: string, reason: string) => void;
}

const STORAGE_KEY = 'poultry-erp-feed-planning-v1';

const FeedPlanningContext = createContext<FeedPlanningContextValue | null>(
  null
);

function today() {
  const d = new Date();

  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, '0'),
    String(d.getDate()).padStart(2, '0'),
  ].join('-');
}
function nowDateTime(): string {
  const date = new Date();

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');

  return `${year}-${month}-${day}T${hours}:${minutes}`;
}
function makePlanKey(batchId: string, locationId: string) {
  return JSON.stringify([batchId, locationId]);
}

function readStoredState(): FeedPlanningState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);

    if (!raw) {
      return {
        plans: [],
        requests: [],
      };
    }

    const value: unknown = JSON.parse(raw);

    if (!value || typeof value !== 'object') {
      return {
        plans: [],
        requests: [],
      };
    }

    const object = value as Partial<FeedPlanningState>;

    const plans = Array.isArray(object.plans)
      ? object.plans.filter(
          (plan): plan is BatchFeedPlan =>
            plan !== null &&
            typeof plan === 'object' &&
            typeof plan.batchId === 'string' &&
            typeof plan.locationId === 'string' &&
            typeof plan.feedTypeId === 'string' &&
            typeof plan.recipeId === 'string' &&
            typeof plan.gramsPerBird === 'number' &&
            Number.isFinite(plan.gramsPerBird) &&
            plan.gramsPerBird > 0
        )
      : [];

    const requests = Array.isArray(object.requests) ? object.requests : [];

    return {
      plans,
      requests,
    };
  } catch (error) {
    console.error("Yem rejalarini o'qishda xatolik:", error);

    return {
      plans: [],
      requests: [],
    };
  }
}

export function FeedPlanningProvider({ children }: { children: ReactNode }) {
  const { getFeedGroupsAsOf, addTransfer } = useWarehouse();

  const { locations } = useLocations();

  const [state, setState] = useState<FeedPlanningState>(readStoredState);

  // Save immediately instead of relying only
  // on a later useEffect.
  function persist(next: FeedPlanningState) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));

    setState(next);
  }

  function getPlan(batchId: string, locationId: string) {
    return state.plans.find(
      (plan) => plan.batchId === batchId && plan.locationId === locationId
    );
  }

  function savePlan(plan: BatchFeedPlan) {
    if (
      !plan.batchId ||
      !plan.locationId ||
      !plan.feedTypeId ||
      !plan.recipeId ||
      !plan.feedTypeName.trim() ||
      !plan.recipeName.trim() ||
      !Number.isFinite(plan.gramsPerBird) ||
      plan.gramsPerBird <= 0
    ) {
      throw new Error("Yem turi, retsept va me'yorni to'g'ri kiriting.");
    }

    const key = makePlanKey(plan.batchId, plan.locationId);

    const nextPlan: BatchFeedPlan = {
      ...plan,
      key,
      feedTypeName: plan.feedTypeName.trim(),
      recipeName: plan.recipeName.trim(),
      updatedAt: new Date().toISOString(),
    };

    const next: FeedPlanningState = {
      ...state,
      plans: [
        ...state.plans.filter(
          (item) =>
            !(
              item.batchId === plan.batchId &&
              item.locationId === plan.locationId
            )
        ),
        nextPlan,
      ],
    };

    persist(next);
  }

  function sendRequest(
    request: Omit<FeedRequest, 'id' | 'status' | 'processedAt' | 'responseNote'>
  ) {
    if (
      !Number.isFinite(request.quantity) ||
      request.quantity <= 0 ||
      !request.feedTypeId ||
      !request.recipeId
    ) {
      throw new Error(
        "So'ralayotgan yem turi, retsepti va miqdorini tekshiring."
      );
    }

    if (!request.date || request.date > today()) {
      throw new Error("So'rov sanasi noto'g'ri.");
    }

    const location = locations.find(
      (item) =>
        item.id === request.locationId && item.active && item.canReceiveFeed
    );

    if (!location) {
      throw new Error("Yem qabul qiluvchi faol bo'lim topilmadi.");
    }

    const duplicate = state.requests.some(
      (item) =>
        item.status === 'pending' &&
        item.batchId === request.batchId &&
        item.locationId === request.locationId &&
        item.feedTypeId === request.feedTypeId &&
        item.recipeId === request.recipeId
    );

    if (duplicate) {
      throw new Error(
        "Bu partiya va retsept uchun kutilayotgan so'rov mavjud."
      );
    }

    const next: FeedPlanningState = {
      ...state,
      requests: [
        {
          ...request,
          id: crypto.randomUUID(),
          locationName: location.name,
          status: 'pending',
        },
        ...state.requests,
      ],
    };

    persist(next);
  }

  function approveRequest(id: string) {
    const request = state.requests.find((item) => item.id === id);

    if (!request || request.status !== 'pending') {
      throw new Error("Tasdiqlash uchun ochiq so'rov topilmadi.");
    }

    const destination = locations.find(
      (item) =>
        item.id === request.locationId && item.active && item.canReceiveFeed
    );

    if (!destination) {
      throw new Error("Qabul qiluvchi bo'lim faol emas.");
    }

    const key = feedKey(request.feedTypeName, request.recipeName);

    const stock = getFeedGroupsAsOf(today()).find((item) => item.key === key);

    if (!stock || stock.remaining + 0.000001 < request.quantity) {
      throw new Error(
        `Omborda yem yetarli emas. Mavjud: ${stock?.remaining ?? 0} kg.`
      );
    }

    // Create the real transfer only on approval.
    addTransfer(key, nowDateTime(), destination.name, request.quantity);

    const next: FeedPlanningState = {
      ...state,
      requests: state.requests.map((item) =>
        item.id === id
          ? {
              ...item,
              status: 'approved' as const,
              processedAt: new Date().toISOString(),
            }
          : item
      ),
    };

    persist(next);
  }

  function rejectRequest(id: string, reason: string) {
    if (!reason.trim()) {
      throw new Error('Rad etish sababini kiriting.');
    }

    const request = state.requests.find((item) => item.id === id);

    if (!request || request.status !== 'pending') {
      throw new Error("Rad etish uchun ochiq so'rov topilmadi.");
    }

    const next: FeedPlanningState = {
      ...state,
      requests: state.requests.map((item) =>
        item.id === id
          ? {
              ...item,
              status: 'rejected' as const,
              responseNote: reason.trim(),
              processedAt: new Date().toISOString(),
            }
          : item
      ),
    };

    persist(next);
  }

  return (
    <FeedPlanningContext.Provider
      value={{
        plans: state.plans,
        requests: state.requests,
        getPlan,
        savePlan,
        sendRequest,
        approveRequest,
        rejectRequest,
      }}
    >
      {children}
    </FeedPlanningContext.Provider>
  );
}

export function useFeedPlanning() {
  const context = useContext(FeedPlanningContext);

  if (!context) {
    throw new Error('FeedPlanningProvider ulanmagan.');
  }

  return context;
}
