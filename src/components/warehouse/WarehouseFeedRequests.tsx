
import { useState } from "react";
import {
  Bell,
  Check,
  X,
  Package,
  ClipboardList,
  AlertTriangle,
} from "lucide-react";

import {
  useFeedPlanning,
  type FeedRequest,
} from "../../context/FeedPlanningContext";

import {
  useWarehouse,
  feedKey,
  formatNumber,
} from "../../context/WarehouseContext";

function localToday() {
  const d = new Date();

  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, "0"),
    String(d.getDate()).padStart(2, "0"),
  ].join("-");
}

function getMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : "Amalni bajarishda xatolik yuz berdi.";
}

export default function WarehouseFeedRequests() {
  const {
    requests,
    approveRequest,
    rejectRequest,
  } = useFeedPlanning();

  const { getFeedGroupsAsOf } = useWarehouse();

  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<
    "pending" | "history"
  >("pending");

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [rejectingId, setRejectingId] =
    useState<string | null>(null);

  const [rejectReason, setRejectReason] =
    useState("");

  const [processingId, setProcessingId] =
    useState<string | null>(null);

  const today = localToday();

  const groups = getFeedGroupsAsOf(today);

  const pending = requests
    .filter((request) => request.status === "pending")
    .sort((a, b) => b.date.localeCompare(a.date));

  const history = requests
    .filter((request) => request.status !== "pending")
    .sort((a, b) =>
      (b.processedAt ?? b.date).localeCompare(
        a.processedAt ?? a.date
      )
    );

  const pendingCount = pending.length;

  function availableStock(request: FeedRequest) {
    const key = feedKey(
      request.feedTypeName,
      request.recipeName
    );

    return (
      groups.find((group) => group.key === key)
        ?.remaining ?? 0
    );
  }

  function openModal() {
    setTab("pending");
    setError("");
    setSuccess("");
    setRejectingId(null);
    setRejectReason("");
    setOpen(true);
  }

  function closeModal() {
    if (processingId) return;

    setOpen(false);
    setRejectingId(null);
    setRejectReason("");
    setError("");
    setSuccess("");
  }

  function approve(id: string) {
    setError("");
    setSuccess("");
    setProcessingId(id);

    try {
      approveRequest(id);

      setSuccess(
        "So'rov tasdiqlandi. Ombor transferi yaratildi."
      );
    } catch (error) {
      setError(getMessage(error));
    } finally {
      setProcessingId(null);
    }
  }

  function startReject(id: string) {
    setError("");
    setSuccess("");
    setRejectReason("");
    setRejectingId(id);
  }

  function confirmReject() {
    if (!rejectingId) return;

    setError("");
    setSuccess("");
    setProcessingId(rejectingId);

    try {
      rejectRequest(rejectingId, rejectReason);

      setSuccess("So'rov rad etildi.");
      setRejectingId(null);
      setRejectReason("");
    } catch (error) {
      setError(getMessage(error));
    } finally {
      setProcessingId(null);
    }
  }

  return (
    <>
      {/* HEADER BUTTON + BADGE */}
      <button
        type="button"
        className="secondary-button relative inline-flex items-center gap-2"
        onClick={openModal}
        title={`${pendingCount} ta yangi yem so'rovi`}
      >
        <Bell size={17} />

        <span>So'rovlar</span>

        {pendingCount > 0 && (
          <span
            className="inline-flex min-h-[22px] min-w-[22px] items-center justify-center rounded-full bg-red-500 px-1.5 text-xs font-bold text-white"
            aria-label={`${pendingCount} ta kutilayotgan so'rov`}
          >
            {pendingCount > 99 ? "99+" : pendingCount}
          </span>
        )}
      </button>

      {/* MODAL */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-3 sm:p-5"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeModal();
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="feed-requests-title"
            className="surface-card flex max-h-[92vh] w-full max-w-[1050px] flex-col overflow-hidden"
          >
            {/* HEADER */}
            <div className="flex shrink-0 items-start justify-between gap-3 border-b border-border-custom p-4 sm:p-5">
              <div className="flex items-start gap-3">
                <ClipboardList
                  size={23}
                  className="mt-1 text-accent"
                />

                <div>
                  <h2
                    id="feed-requests-title"
                    className="text-lg font-semibold"
                  >
                    Fermalardan kelgan yem so'rovlari
                  </h2>

                  <p className="mt-1 text-xs text-muted">
                    So'rovni ko'rib chiqing va
                    asosiy ombordagi zaxirani tekshiring.
                  </p>
                </div>
              </div>

              <button
                type="button"
                className="secondary-button !min-h-8 !px-2"
                onClick={closeModal}
                aria-label="Yopish"
              >
                <X size={18} />
              </button>
            </div>

            {/* TABS */}
            <div className="flex shrink-0 gap-2 border-b border-border-custom px-4 py-3 sm:px-5">
              <button
                type="button"
                onClick={() => {
                  setTab("pending");
                  setError("");
                  setSuccess("");
                  setRejectingId(null);
                }}
                className={
                  tab === "pending"
                    ? "primary-button !min-h-9"
                    : "secondary-button !min-h-9"
                }
              >
                Kutilayotganlar
                <span
                  className={
                    tab === "pending"
                      ? "rounded-full bg-white/20 px-2 py-0.5 text-xs"
                      : "rounded-full bg-red-500 px-2 py-0.5 text-xs text-white"
                  }
                >
                  {pendingCount}
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setTab("history");
                  setError("");
                  setSuccess("");
                  setRejectingId(null);
                }}
                className={
                  tab === "history"
                    ? "primary-button !min-h-9"
                    : "secondary-button !min-h-9"
                }
              >
                Tarix
                <span className="text-xs opacity-70">
                  ({history.length})
                </span>
              </button>
            </div>

            {/* SCROLLABLE CONTENT */}
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4 sm:p-5">
              {error && (
                <div
                  role="alert"
                  className="flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-500"
                >
                  <AlertTriangle
                    size={17}
                    className="mt-0.5 shrink-0"
                  />
                  <span>{error}</span>
                </div>
              )}

              {success && (
                <p
                  role="status"
                  className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-500"
                >
                  {success}
                </p>
              )}

              {tab === "pending" && (
                <>
                  {pending.length === 0 ? (
                    <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
                      <Package
                        size={34}
                        className="text-muted"
                      />

                      <p className="font-medium">
                        Yangi yem so'rovlari yo'q
                      </p>

                      <p className="text-sm text-muted">
                        Fermalardan so'rov kelganda
                        shu yerda paydo bo'ladi.
                      </p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="erp-table min-w-[900px]">
                        <thead>
                          <tr>
                            <th>Sana</th>
                            <th>Bo'lim</th>
                            <th>Partiya</th>
                            <th>Yem turi</th>
                            <th>Retsept</th>
                            <th>So'ralgan</th>
                            <th>Omborda</th>
                            <th>Amallar</th>
                          </tr>
                        </thead>

                        <tbody>
                          {pending.map((request) => {
                            const available =
                              availableStock(request);

                            const enough =
                              available + 0.000001 >=
                              request.quantity;

                            return (
                              <tr key={request.id}>
                                <td>{request.date}</td>

                                <td>
                                  {request.locationName}
                                </td>

                                <td className="font-semibold">
                                  {request.batchCode}
                                </td>

                                <td>
                                  {request.feedTypeName}
                                </td>

                                <td>
                                  {request.recipeName}
                                </td>

                                <td className="font-semibold">
                                  {formatNumber(
                                    request.quantity
                                  )}{" "}
                                  kg
                                </td>

                                <td>
                                  <span
                                    className={
                                      enough
                                        ? "text-emerald-500"
                                        : "text-red-500"
                                    }
                                  >
                                    {formatNumber(
                                      available
                                    )}{" "}
                                    kg
                                  </span>
                                </td>

                                <td>
                                  <div className="flex items-center gap-2">
                                    <button
                                      type="button"
                                      className="primary-button !min-h-8 !px-2"
                                      disabled={
                                        !enough ||
                                        processingId !== null
                                      }
                                      onClick={() =>
                                        approve(request.id)
                                      }
                                      title={
                                        enough
                                          ? "Yemni transfer qilish"
                                          : "Omborda yem yetarli emas"
                                      }
                                    >
                                      <Check size={15} />
                                      Tasdiqlash
                                    </button>

                                    <button
                                      type="button"
                                      className="secondary-button !min-h-8 !px-2"
                                      disabled={
                                        processingId !== null
                                      }
                                      onClick={() =>
                                        startReject(request.id)
                                      }
                                    >
                                      <X size={15} />
                                      Rad etish
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              )}

              {tab === "history" && (
                <>
                  {history.length === 0 ? (
                    <p className="py-10 text-center text-sm text-muted">
                      Hali ko'rib chiqilgan so'rovlar yo'q.
                    </p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="erp-table min-w-[750px]">
                        <thead>
                          <tr>
                            <th>Sana</th>
                            <th>Bo'lim</th>
                            <th>Partiya</th>
                            <th>Retsept</th>
                            <th>Miqdor</th>
                            <th>Holat</th>
                            <th>Izoh</th>
                          </tr>
                        </thead>

                        <tbody>
                          {history.map((request) => (
                            <tr key={request.id}>
                              <td>{request.date}</td>

                              <td>
                                {request.locationName}
                              </td>

                              <td>
                                {request.batchCode}
                              </td>

                              <td>
                                {request.recipeName}
                              </td>

                              <td>
                                {formatNumber(
                                  request.quantity
                                )}{" "}
                                kg
                              </td>

                              <td>
                                <span
                                  className={
                                    request.status === "approved"
                                      ? "status-badge status-success"
                                      : "status-badge status-neutral"
                                  }
                                >
                                  {request.status === "approved"
                                    ? "Tasdiqlangan"
                                    : "Rad etilgan"}
                                </span>
                              </td>

                              <td>
                                {request.responseNote || "—"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              )}

              {/* REJECTION FORM INSIDE MODAL */}
              {rejectingId && tab === "pending" && (
                <div className="space-y-3 rounded-xl border border-border-custom p-4">
                  <h3 className="font-semibold">
                    So'rovni rad etish
                  </h3>

                  <label className="form-label">
                    Rad etish sababi *
                  </label>

                  <textarea
                    className="form-input min-h-[80px]"
                    value={rejectReason}
                    onChange={(event) =>
                      setRejectReason(event.target.value)
                    }
                    placeholder="Masalan: omborda yem yetarli emas..."
                  />

                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={() => {
                        setRejectingId(null);
                        setRejectReason("");
                      }}
                    >
                      Bekor qilish
                    </button>

                    <button
                      type="button"
                      className="primary-button"
                      disabled={
                        !rejectReason.trim() ||
                        processingId !== null
                      }
                      onClick={confirmReject}
                    >
                      Rad etishni tasdiqlash
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* FOOTER */}
            <div className="flex shrink-0 items-center justify-between gap-3 border-t border-border-custom p-4 sm:px-5">
              <p className="text-xs text-muted">
                Transfer faqat tasdiqlanganda yaratiladi.
              </p>

              <button
                type="button"
                className="secondary-button"
                onClick={closeModal}
              >
                Yopish
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
