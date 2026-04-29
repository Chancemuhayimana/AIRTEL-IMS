import { FormEvent, useEffect, useMemo, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  Bell,
  Boxes,
  Building2,
  ChevronDown,
  ClipboardList,
  Download,
  FolderKanban,
  Globe2,
  LayoutDashboard,
  LockKeyhole,
  RefreshCcw,
  QrCode,
  Save,
  Settings2,
  ShieldCheck,
  TableProperties,
  TriangleAlert,
  UserCog,
  Users,
} from "lucide-react";
import AccountSettingsPanel from "../components/AccountSettingsPanel";
import QRCode from "qrcode";
import AirtelLogo from "../components/AirtelLogo";
import DashboardWaveLoader from "../components/DashboardWaveLoader";
import DashboardToast from "../components/DashboardToast";
import OverviewShortcutCard from "../components/OverviewShortcutCard";
import UserMenu from "../components/UserMenu";
import { fetchJson, getApiMessage } from "../api";
import { API_BASE_URL } from "../config";
import { moduleSummary } from "../data";
import type {
  AdminUser,
  AdminReports,
  AdminSystemControls,
  AuditLog,
  BackupSnapshot,
  LoggedInUser,
  Lookups,
  QrUser,
  SummaryCard,
} from "../types";

type SidebarLink = {
  label: string;
  href: string;
  icon: LucideIcon;
};

type SidebarGroup = {
  title: string;
  icon: LucideIcon;
  links: SidebarLink[];
};

type AdminDashboardPageProps = {
  user: LoggedInUser;
  onLogout: () => void;
  onUserUpdate: (user: LoggedInUser) => void;
};

const sidebarGroups: SidebarGroup[] = [
  {
    title: "Dashboard",
    icon: LayoutDashboard,
    links: [
      { label: "Overview", href: "#overview", icon: ClipboardList },
      { label: "Users", href: "#users", icon: Users },
      { label: "Reports", href: "#reports", icon: BarChart3 },
      { label: "Policies", href: "#policies", icon: Settings2 },
      { label: "Backup", href: "#backup", icon: RefreshCcw },
      { label: "Audit", href: "#audit", icon: Bell },
      { label: "Roles", href: "#roles", icon: ShieldCheck },
    ],
  },
  {
    title: "Employee Settings",
    icon: UserCog,
    links: [
      { label: "Permissions", href: "#permissions", icon: LockKeyhole },
      { label: "Countries", href: "#countries", icon: Globe2 },
      { label: "Branches", href: "#branches", icon: Building2 },
      { label: "Departments", href: "#departments", icon: FolderKanban },
    ],
  },
  {
    title: "Asset Settings",
    icon: Boxes,
    links: [
      { label: "Admin Tables", href: "#admin-tables", icon: TableProperties },
      { label: "Modules", href: "#modules", icon: Boxes },
      { label: "QR Panel", href: "#qr-panel", icon: QrCode },
      { label: "My Settings", href: "#settings", icon: UserCog },
    ],
  },
];

const emptyLookups: Lookups = {
  roles: [],
  permissions: [],
  countries: [],
  branches: [],
  departments: [],
};

const emptyReports: AdminReports = {
  assetMetrics: {
    totalAssets: 0,
    availableAssets: 0,
    assignedAssets: 0,
    maintenanceAssets: 0,
    retiredAssets: 0,
    lostAssets: 0,
  },
  requestMetrics: {
    totalRequests: 0,
    pendingRequests: 0,
    approvedRequests: 0,
    rejectedRequests: 0,
    fulfilledRequests: 0,
  },
  assignmentMetrics: {
    activeAssignments: 0,
    returnedAssignments: 0,
    overdueAssignments: 0,
  },
  issueMetrics: {
    openIssues: 0,
    highPriorityIssues: 0,
  },
  recentAssets: [],
  recentRequests: [],
};

const emptySystemControls: AdminSystemControls = {
  approvalRoles: {
    branchManagerRole: "Branch manager",
    hrRole: "Hr",
    itRole: "IT manager",
    storekeeperRole: "IT Support engineer",
  },
  alertThresholds: {
    lowStockThreshold: 3,
    overdueAssignmentDays: 7,
    highPriorityIssueThreshold: 5,
  },
  backups: [],
};

const airtelCountryDialCodes: Record<string, string> = {
  Chad: "235",
  Congo: "242",
  "Democratic Republic of the Congo": "243",
  Gabon: "241",
  Kenya: "254",
  Madagascar: "261",
  Malawi: "265",
  Niger: "227",
  Nigeria: "234",
  Rwanda: "250",
  Seychelles: "248",
  Tanzania: "255",
  Uganda: "256",
  Zambia: "260",
};

const employmentStatusOptions = [
  "Permanent",
  "Contract",
  "Probation",
  "Intern",
  "Consultant",
  "Retired",
];

function detectCountryFromPhoneInput(phoneNumber: string, countries: Lookups["countries"]) {
  const digitsOnly = phoneNumber.replace(/[^\d+]/g, "").replace(/^\+/, "");

  if (!digitsOnly) {
    return null;
  }

  const matchedCountry = countries.find((country) => {
    const dialCode = airtelCountryDialCodes[country.name];
    return dialCode ? digitsOnly.startsWith(dialCode) : false;
  });

  if (!matchedCountry) {
    return null;
  }

  return {
    id: matchedCountry.id,
    name: matchedCountry.name,
    dialCode: airtelCountryDialCodes[matchedCountry.name],
  };
}

const summaryCardConfig: Record<string, { icon: LucideIcon; section: string; actionLabel: string }> = {
  "System roles": {
    icon: ShieldCheck,
    section: "roles",
    actionLabel: "Open roles",
  },
  "Core tables": {
    icon: TableProperties,
    section: "admin-tables",
    actionLabel: "Open tables",
  },
  "Pending approvals": {
    icon: ClipboardList,
    section: "users",
    actionLabel: "Review users",
  },
  "Open alerts": {
    icon: Bell,
    section: "qr-panel",
    actionLabel: "Open panel",
  },
};

const DEFAULT_ITEMS_PER_PAGE = 3;
const PAGE_SIZE_OPTIONS = [3, 6, 9];

function formatCurrencyAmount(value: number | null | undefined) {
  return Number(value ?? 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function getDepreciationSnapshot({
  purchaseCost,
  purchaseDate,
  purchaseYear,
  lifespanYears,
}: {
  purchaseCost: number | null | undefined;
  purchaseDate: string | null | undefined;
  purchaseYear: number | null | undefined;
  lifespanYears: number | null | undefined;
}) {
  const cost = Number(purchaseCost ?? 0);
  const safeLifespanYears =
    typeof lifespanYears === "number" && Number.isFinite(lifespanYears) && lifespanYears > 0
      ? lifespanYears
      : 4;

  if (!Number.isFinite(cost) || cost <= 0) {
    return null;
  }

  const startDate = purchaseDate
    ? new Date(purchaseDate)
    : typeof purchaseYear === "number" && Number.isInteger(purchaseYear) && purchaseYear >= 1000
      ? new Date(`${purchaseYear}-01-01T00:00:00`)
      : null;

  if (!startDate || Number.isNaN(startDate.getTime())) {
    return {
      annualDepreciation: cost / safeLifespanYears,
      accumulatedDepreciation: 0,
      bookValue: cost,
    };
  }

  const today = new Date();
  let ageYears = today.getFullYear() - startDate.getFullYear();
  const monthDelta = today.getMonth() - startDate.getMonth();
  const dayDelta = today.getDate() - startDate.getDate();
  if (monthDelta < 0 || (monthDelta === 0 && dayDelta < 0)) {
    ageYears -= 1;
  }

  const safeAgeYears = Math.max(ageYears, 0);
  const annualDepreciation = cost / safeLifespanYears;
  const accumulatedDepreciation = Math.min(cost, annualDepreciation * safeAgeYears);
  const bookValue = Math.max(0, cost - accumulatedDepreciation);

  return {
    annualDepreciation,
    accumulatedDepreciation,
    bookValue,
  };
}

function AdminDashboardPage({ user, onLogout, onUserUpdate }: AdminDashboardPageProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [activeSection, setActiveSection] = useState("overview");
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    Dashboard: true,
    "Employee Settings": true,
    "Asset Settings": true,
  });

  const [summaryCards, setSummaryCards] = useState<SummaryCard[]>([]);
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [reports, setReports] = useState<AdminReports>(emptyReports);
  const [systemControls, setSystemControls] = useState<AdminSystemControls>(emptySystemControls);
  const [lookups, setLookups] = useState<Lookups>(emptyLookups);
  const [isDashboardLoading, setIsDashboardLoading] = useState(false);
  const [dashboardError, setDashboardError] = useState("");
  const [actionMessage, setActionMessage] = useState("");
  const [actionError, setActionError] = useState("");
  const [isUserFormOpen, setIsUserFormOpen] = useState(false);
  const [isUserListOpen, setIsUserListOpen] = useState(true);
  const [editingUserId, setEditingUserId] = useState<number | null>(null);

  const [selectedQrUser, setSelectedQrUser] = useState<QrUser | null>(null);
  const [qrImageUrl, setQrImageUrl] = useState("");
  const [isQrLoading, setIsQrLoading] = useState(false);
  const [qrLoadingUserId, setQrLoadingUserId] = useState<number | null>(null);
  const [qrError, setQrError] = useState("");
  const [statusLoadingUserId, setStatusLoadingUserId] = useState<number | null>(null);
  const [deleteLoadingUserId, setDeleteLoadingUserId] = useState<number | null>(null);
  const [resendLoadingUserId, setResendLoadingUserId] = useState<number | null>(null);
  const [resetPasswordLoadingUserId, setResetPasswordLoadingUserId] = useState<number | null>(null);
  const [approvingUserId, setApprovingUserId] = useState<number | null>(null);
  const [userSearch, setUserSearch] = useState("");
  const [userStatusFilter, setUserStatusFilter] = useState("all");
  const [isExportingUsers, setIsExportingUsers] = useState(false);
  const [isExportingAuditLogs, setIsExportingAuditLogs] = useState(false);
  const [isExportingAssets, setIsExportingAssets] = useState(false);
  const [isExportingRequests, setIsExportingRequests] = useState(false);
  const [isSavingApprovalPolicy, setIsSavingApprovalPolicy] = useState(false);
  const [isSavingAlertThresholds, setIsSavingAlertThresholds] = useState(false);
  const [isCreatingBackup, setIsCreatingBackup] = useState(false);
  const [restoringBackupId, setRestoringBackupId] = useState<number | null>(null);
  const [downloadingBackupId, setDownloadingBackupId] = useState<number | null>(null);
  const [reportPageByKey, setReportPageByKey] = useState<Record<string, number>>({});
  const [pageSizeByKey, setPageSizeByKey] = useState<Record<string, number>>({});

  const [userForm, setUserForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phoneNumber: "",
    roleId: "",
    employeeCode: "",
    jobTitle: "",
    employmentStatus: "",
    officeLocation: "",
    startDate: "",
    countryId: "",
    hqId: "",
    branchId: "",
    departmentId: "",
  });
  const [roleForm, setRoleForm] = useState({ name: "", description: "" });
  const [permissionForm, setPermissionForm] = useState({ code: "", name: "", moduleName: "" });
  const [branchForm, setBranchForm] = useState({ name: "", branchCode: "", countryId: "" });
  const [departmentForm, setDepartmentForm] = useState({ name: "", countryId: "", hqId: "", branchId: "" });
  const [approvalPolicyForm, setApprovalPolicyForm] = useState(emptySystemControls.approvalRoles);
  const [alertThresholdForm, setAlertThresholdForm] = useState({
    lowStockThreshold: String(emptySystemControls.alertThresholds.lowStockThreshold),
    overdueAssignmentDays: String(emptySystemControls.alertThresholds.overdueAssignmentDays),
    highPriorityIssueThreshold: String(emptySystemControls.alertThresholds.highPriorityIssueThreshold),
  });

  const loadAdminWorkspace = async () => {
    setIsDashboardLoading(true);
    setDashboardError("");

    try {
      const [summaryResult, usersResult, lookupsResult, auditLogsResult, reportsResult, systemControlsResult] = await Promise.all([
        fetchJson<{ cards?: SummaryCard[] }>(`${API_BASE_URL}/admin/summary`),
        fetchJson<AdminUser[]>(`${API_BASE_URL}/admin/users`),
        fetchJson<Lookups>(`${API_BASE_URL}/admin/lookups`),
        fetchJson<AuditLog[]>(`${API_BASE_URL}/admin/audit-logs`),
        fetchJson<AdminReports>(`${API_BASE_URL}/admin/reports`),
        fetchJson<AdminSystemControls>(`${API_BASE_URL}/admin/system-controls`),
      ]);

      if (
        !summaryResult.response.ok ||
        !usersResult.response.ok ||
        !lookupsResult.response.ok ||
        !auditLogsResult.response.ok ||
        !reportsResult.response.ok ||
        !systemControlsResult.response.ok
      ) {
        throw new Error(
          getApiMessage(
            summaryResult.data ??
              usersResult.data ??
              lookupsResult.data ??
              auditLogsResult.data ??
              reportsResult.data ??
              systemControlsResult.data,
            "Failed to load admin dashboard data.",
          ),
        );
      }

      const summaryData = summaryResult.data;
      const userRows = usersResult.data;
      const lookupData = lookupsResult.data;
      const auditRows = auditLogsResult.data;
      const reportData = reportsResult.data;
      const systemControlData = systemControlsResult.data;

      if (!summaryData || !userRows || !lookupData || !auditRows || !reportData || !systemControlData) {
        throw new Error("Admin dashboard returned an incomplete response.");
      }

      setSummaryCards(summaryData.cards ?? []);
      setAdminUsers(userRows);
      setLookups(lookupData);
      setAuditLogs(auditRows);
      setReports(reportData);
      setSystemControls(systemControlData);
      setApprovalPolicyForm(systemControlData.approvalRoles);
      setAlertThresholdForm({
        lowStockThreshold: String(systemControlData.alertThresholds.lowStockThreshold),
        overdueAssignmentDays: String(systemControlData.alertThresholds.overdueAssignmentDays),
        highPriorityIssueThreshold: String(systemControlData.alertThresholds.highPriorityIssueThreshold),
      });
    } catch (error) {
      setDashboardError(error instanceof Error ? error.message : "Dashboard load failed.");
    } finally {
      setIsDashboardLoading(false);
    }
  };

  useEffect(() => {
    void loadAdminWorkspace();
  }, []);

  const paginateRows = <T,>(rows: T[], currentPage: number, pageSize: number) =>
    rows.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const renderPaginationBar = (
    pageKey: string,
    totalItems: number,
    currentPage: number,
    pageSize: number,
    onPageChange: (page: number) => void,
  ) => {
    const totalPages = Math.max(Math.ceil(totalItems / pageSize), 1);

    if (totalItems <= pageSize) {
      return null;
    }

    return (
      <div className="pagination-bar">
        <div className="pagination-meta">
          <label className="pagination-size-control">
            <span>Per page</span>
            <select
              className="pagination-size-select"
              value={pageSize}
              onChange={(event) => {
                const nextPageSize = Number(event.target.value);
                setPageSizeByKey((current) => ({
                  ...current,
                  [pageKey]: nextPageSize,
                }));
                onPageChange(1);
              }}
            >
              {PAGE_SIZE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
          <span className="pagination-summary">
            Showing {(currentPage - 1) * pageSize + 1}-{Math.min(currentPage * pageSize, totalItems)} of {totalItems}
          </span>
        </div>
        <div className="pagination-actions">
          <button
            className="pagination-button"
            type="button"
            onClick={() => onPageChange(Math.max(currentPage - 1, 1))}
            disabled={currentPage === 1}
          >
            Previous
          </button>
          {Array.from({ length: totalPages }, (_, index) => index + 1).map((pageNumber) => (
            <button
              className={`pagination-button ${pageNumber === currentPage ? "is-active" : ""}`}
              type="button"
              key={pageNumber}
              onClick={() => onPageChange(pageNumber)}
            >
              {pageNumber}
            </button>
          ))}
          <button
            className="pagination-button"
            type="button"
            onClick={() => onPageChange(Math.min(currentPage + 1, totalPages))}
            disabled={currentPage === totalPages}
          >
            Next
          </button>
        </div>
      </div>
    );
  };

  const submitAdminAction = async (url: string, payload: object, onSuccess: () => void, method = "POST") => {
    setActionMessage("");
    setActionError("");

    try {
      const { response, data } = await fetchJson<{ message?: string }>(`${API_BASE_URL}${url}`, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(getApiMessage(data, "Request failed."));
      }

      setActionMessage(getApiMessage(data, "Saved successfully."));
      onSuccess();
      await loadAdminWorkspace();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Request failed.");
    }
  };

  const handleCreateUser = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (editingUserId) {
      await submitAdminAction(
        `/admin/users/${editingUserId}`,
        {
          ...userForm,
          actorUserId: user.id,
          countryId: userForm.countryId || null,
          branchId: userForm.branchId || null,
          departmentId: userForm.departmentId || null,
        },
        () => {
          setUserForm({
            firstName: "",
            lastName: "",
            email: "",
            phoneNumber: "",
            roleId: "",
            employeeCode: "",
            jobTitle: "",
            employmentStatus: "",
            officeLocation: "",
            startDate: "",
            countryId: "",
            hqId: "",
            branchId: "",
            departmentId: "",
          });
          setEditingUserId(null);
        },
        "PUT",
      );
      setIsUserFormOpen(false);
      return;
    }

    await submitAdminAction(
      "/admin/users",
      {
        ...userForm,
        actorUserId: user.id,
        countryId: userForm.countryId || null,
        branchId: userForm.branchId || null,
        departmentId: userForm.departmentId || null,
      },
      () =>
        setUserForm({
          firstName: "",
          lastName: "",
          email: "",
          phoneNumber: "",
          roleId: "",
          employeeCode: "",
          jobTitle: "",
          employmentStatus: "",
          officeLocation: "",
          startDate: "",
          countryId: "",
          hqId: "",
          branchId: "",
          departmentId: "",
        }),
    );
    setIsUserFormOpen(false);
  };

  const handleEditUser = async (account: AdminUser) => {
    setActionError("");
    setActionMessage("");

    try {
      const { response, data } = await fetchJson<AdminUser>(`${API_BASE_URL}/admin/users/${account.id}`);

      if (response.ok && data) {
        const fullUser = data;

        setEditingUserId(fullUser.id);
        setIsUserFormOpen(true);
        const inferredHqId = getDefaultHqId(fullUser.country_id ? String(fullUser.country_id) : "");
        setUserForm({
          firstName: fullUser.first_name || "",
          lastName: fullUser.last_name || "",
          email: fullUser.email,
          phoneNumber: fullUser.phone_number || "",
          roleId: fullUser.role_id ? String(fullUser.role_id) : "",
          employeeCode: fullUser.employee_code || "",
          jobTitle: fullUser.job_title || "",
          employmentStatus: fullUser.employment_status || "",
          officeLocation: fullUser.office_location || "",
          startDate: fullUser.start_date ? String(fullUser.start_date).slice(0, 10) : "",
          countryId: fullUser.country_id ? String(fullUser.country_id) : "",
          hqId: inferredHqId,
          branchId: fullUser.branch_id ? String(fullUser.branch_id) : "",
          departmentId: fullUser.department_id ? String(fullUser.department_id) : "",
        });
        return;
      }
    } catch {
      // Fall back to the list payload below if the detail request is unavailable.
    }

    const [firstName = "", ...lastNameParts] = account.full_name.split(" ");
    const matchedRole = lookups.roles.find((role) => role.name === account.role_name);

    setEditingUserId(account.id);
    setIsUserFormOpen(true);
    const inferredHqId = getDefaultHqId(account.country_id ? String(account.country_id) : "");
    setUserForm({
      firstName: account.first_name || firstName,
      lastName: account.last_name || lastNameParts.join(" "),
      email: account.email,
      phoneNumber: account.phone_number || "",
      roleId: account.role_id ? String(account.role_id) : matchedRole ? String(matchedRole.id) : "",
      employeeCode: account.employee_code || "",
      jobTitle: account.job_title || "",
      employmentStatus: account.employment_status || "",
      officeLocation: account.office_location || "",
      startDate: account.start_date ? String(account.start_date).slice(0, 10) : "",
      countryId: account.country_id ? String(account.country_id) : "",
      hqId: inferredHqId,
      branchId: account.branch_id ? String(account.branch_id) : "",
      departmentId: account.department_id ? String(account.department_id) : "",
    });
  };

  const resetUserForm = () => {
    setEditingUserId(null);
    setUserForm({
      firstName: "",
      lastName: "",
      email: "",
      phoneNumber: "",
      roleId: "",
      employeeCode: "",
      jobTitle: "",
      employmentStatus: "",
      officeLocation: "",
      startDate: "",
      countryId: "",
      hqId: "",
      branchId: "",
      departmentId: "",
    });
    setIsUserFormOpen(false);
  };

  const handleCreateRole = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await submitAdminAction("/admin/roles", roleForm, () => setRoleForm({ name: "", description: "" }));
  };

  const handleCreatePermission = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await submitAdminAction(
      "/admin/permissions",
      permissionForm,
      () => setPermissionForm({ code: "", name: "", moduleName: "" }),
    );
  };

  const handleSeedCountries = async () => {
    await submitAdminAction("/admin/countries/seed", {}, () => undefined);
  };

  const handleSeedBranches = async () => {
    await submitAdminAction("/admin/branches/seed", {}, () => undefined);
  };

  const handleCreateBranch = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await submitAdminAction(
      "/admin/branches",
      branchForm,
      () => setBranchForm({ name: "", branchCode: "", countryId: "" }),
    );
  };

  const handleCreateDepartment = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await submitAdminAction(
      "/admin/departments",
      departmentForm,
      () => setDepartmentForm({ name: "", countryId: "", hqId: "", branchId: "" }),
    );
  };

  const handleViewQrCode = async (userId: number) => {
    setIsQrLoading(true);
    setQrLoadingUserId(userId);
    setQrError("");

    try {
      const { response, data } = await fetchJson<{ message?: string; qrPayload?: string; user?: QrUser }>(`${API_BASE_URL}/admin/users/${userId}/qr`);

      if (!response.ok) {
        throw new Error(getApiMessage(data, "Failed to load QR code data."));
      }

      if (!data?.qrPayload || !data.user) {
        throw new Error("QR code data was incomplete.");
      }

      const dataUrl = await QRCode.toDataURL(data.qrPayload, {
        width: 240,
        margin: 2,
        color: {
          dark: "#000000",
          light: "#ffffff",
        },
      });

      setSelectedQrUser(data.user);
      setQrImageUrl(dataUrl);
      window.location.hash = "qr-panel";
    } catch (error) {
      setQrError(error instanceof Error ? error.message : "Failed to load QR code.");
    } finally {
      setIsQrLoading(false);
      setQrLoadingUserId(null);
    }
  };

  const handleDownloadQr = () => {
    if (!qrImageUrl || !selectedQrUser) {
      return;
    }

    const link = document.createElement("a");
    link.href = qrImageUrl;
    link.download = `${selectedQrUser.fullName.replace(/\s+/g, "-").toLowerCase()}-qr.png`;
    link.click();
  };

  const handleUserStatusChange = async (accountId: number, status: "active" | "inactive") => {
    setStatusLoadingUserId(accountId);
    setActionMessage("");
    setActionError("");

    try {
      const { response, data } = await fetchJson<{ message?: string }>(`${API_BASE_URL}/admin/users/${accountId}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, actorUserId: user.id }),
      });

      if (!response.ok) {
        throw new Error(getApiMessage(data, "Failed to update user status."));
      }

      setActionMessage(getApiMessage(data, "User status updated."));
      await loadAdminWorkspace();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Failed to update user status.");
    } finally {
      setStatusLoadingUserId(null);
    }
  };

  const handleDeleteUser = async (account: AdminUser) => {
    const confirmed = window.confirm(`Delete ${account.full_name}'s account? This action cannot be undone.`);

    if (!confirmed) {
      return;
    }

    setDeleteLoadingUserId(account.id);
    setActionMessage("");
    setActionError("");

    try {
      const { response, data } = await fetchJson<{ message?: string }>(`${API_BASE_URL}/admin/users/${account.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actorUserId: user.id }),
      });

      if (!response.ok) {
        throw new Error(getApiMessage(data, "Failed to delete user."));
      }

      if (editingUserId === account.id) {
        resetUserForm();
      }

      setActionMessage(getApiMessage(data, "User deleted successfully."));
      await loadAdminWorkspace();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Failed to delete user.");
    } finally {
      setDeleteLoadingUserId(null);
    }
  };

  const handleResendWelcomeEmail = async (account: AdminUser) => {
    setResendLoadingUserId(account.id);
    setActionMessage("");
    setActionError("");

    try {
      const { response, data } = await fetchJson<{ message?: string }>(`${API_BASE_URL}/admin/users/${account.id}/resend-welcome`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actorUserId: user.id }),
      });

      if (!response.ok) {
        throw new Error(getApiMessage(data, "Failed to resend welcome email."));
      }

      setActionMessage(getApiMessage(data, "Welcome email resent."));
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Failed to resend welcome email.");
    } finally {
      setResendLoadingUserId(null);
    }
  };

  const handleAdminResetPassword = async (account: AdminUser) => {
    const confirmed = window.confirm(`Reset password for ${account.full_name}? A new temporary password will be emailed.`);

    if (!confirmed) {
      return;
    }

    setResetPasswordLoadingUserId(account.id);
    setActionMessage("");
    setActionError("");

    try {
      const { response, data } = await fetchJson<{ message?: string }>(`${API_BASE_URL}/admin/users/${account.id}/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actorUserId: user.id }),
      });

      if (!response.ok) {
        throw new Error(getApiMessage(data, "Failed to reset password."));
      }

      setActionMessage(getApiMessage(data, "Password reset completed."));
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Failed to reset password.");
    } finally {
      setResetPasswordLoadingUserId(null);
    }
  };

  const handleApproveUser = async (userId: number) => {
    setApprovingUserId(userId);
    setActionMessage("");
    setActionError("");

    try {
      const { response, data } = await fetchJson<{ message?: string }>(`${API_BASE_URL}/admin/users/${userId}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actorUserId: user.id }),
      });

      if (!response.ok) {
        throw new Error(getApiMessage(data, "Failed to approve user."));
      }

      setActionMessage(getApiMessage(data, "User approved successfully."));
      await loadAdminWorkspace();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Failed to approve user.");
    } finally {
      setApprovingUserId(null);
    }
  };

  const downloadAdminExport = async (path: string, filename: string) => {
    const response = await fetch(`${API_BASE_URL}${path}`);

    if (!response.ok) {
      let message = "Failed to export data.";

      try {
        const data = await response.json();
        message = data.message || message;
      } catch {
        // Ignore JSON parsing errors for non-JSON error bodies.
      }

      throw new Error(message);
    }

    const blob = await response.blob();
    const objectUrl = window.URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = objectUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(objectUrl);
  };

  const handleExportUsers = async () => {
    setIsExportingUsers(true);
    setActionMessage("");
    setActionError("");

    try {
      await downloadAdminExport("/admin/export/users", "admin-users.html");
      setActionMessage("Users export downloaded.");
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Failed to export users.");
    } finally {
      setIsExportingUsers(false);
    }
  };

  const handleExportAuditLogs = async () => {
    setIsExportingAuditLogs(true);
    setActionMessage("");
    setActionError("");

    try {
      await downloadAdminExport("/admin/export/audit-logs", "admin-audit-logs.html");
      setActionMessage("Audit export downloaded.");
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Failed to export audit logs.");
    } finally {
      setIsExportingAuditLogs(false);
    }
  };

  const handleExportAssets = async () => {
    setIsExportingAssets(true);
    setActionMessage("");
    setActionError("");

    try {
      await downloadAdminExport("/admin/export/assets", "admin-assets.html");
      setActionMessage("Assets export downloaded.");
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Failed to export assets.");
    } finally {
      setIsExportingAssets(false);
    }
  };

  const handleExportRequests = async () => {
    setIsExportingRequests(true);
    setActionMessage("");
    setActionError("");

    try {
      await downloadAdminExport("/admin/export/requests", "admin-requests.html");
      setActionMessage("Requests export downloaded.");
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Failed to export requests.");
    } finally {
      setIsExportingRequests(false);
    }
  };

  const handleSaveApprovalPolicy = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSavingApprovalPolicy(true);
    setActionMessage("");
    setActionError("");

    try {
      const { response, data } = await fetchJson<{ message?: string }>(`${API_BASE_URL}/admin/system-controls/approval`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          actorUserId: user.id,
          ...approvalPolicyForm,
        }),
      });

      if (!response.ok) {
        throw new Error(getApiMessage(data, "Failed to save approval policy."));
      }

      setActionMessage(getApiMessage(data, "Approval policy updated."));
      await loadAdminWorkspace();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Failed to save approval policy.");
    } finally {
      setIsSavingApprovalPolicy(false);
    }
  };

  const handleSaveAlertThresholds = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSavingAlertThresholds(true);
    setActionMessage("");
    setActionError("");

    try {
      const { response, data } = await fetchJson<{ message?: string }>(`${API_BASE_URL}/admin/system-controls/alerts`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          actorUserId: user.id,
          lowStockThreshold: Number(alertThresholdForm.lowStockThreshold),
          overdueAssignmentDays: Number(alertThresholdForm.overdueAssignmentDays),
          highPriorityIssueThreshold: Number(alertThresholdForm.highPriorityIssueThreshold),
        }),
      });

      if (!response.ok) {
        throw new Error(getApiMessage(data, "Failed to save alert thresholds."));
      }

      setActionMessage(getApiMessage(data, "Alert thresholds updated."));
      await loadAdminWorkspace();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Failed to save alert thresholds.");
    } finally {
      setIsSavingAlertThresholds(false);
    }
  };

  const handleCreateBackup = async () => {
    setIsCreatingBackup(true);
    setActionMessage("");
    setActionError("");

    try {
      const { response, data } = await fetchJson<{ message?: string }>(`${API_BASE_URL}/admin/backups`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          actorUserId: user.id,
          label: `Manual backup ${new Date().toLocaleString()}`,
        }),
      });

      if (!response.ok) {
        throw new Error(getApiMessage(data, "Failed to create backup."));
      }

      setActionMessage(getApiMessage(data, "Backup created successfully."));
      await loadAdminWorkspace();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Failed to create backup.");
    } finally {
      setIsCreatingBackup(false);
    }
  };

  const handleDownloadBackup = async (backup: BackupSnapshot) => {
    setDownloadingBackupId(backup.id);
    setActionMessage("");
    setActionError("");

    try {
      await downloadAdminExport(`/admin/backups/${backup.id}/download`, backup.file_name);
      setActionMessage("Backup downloaded.");
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Failed to download backup.");
    } finally {
      setDownloadingBackupId(null);
    }
  };

  const handleRestoreBackup = async (backup: BackupSnapshot) => {
    const confirmed = window.confirm(`Restore backup "${backup.label}"? This will replace current live data with the saved snapshot.`);

    if (!confirmed) {
      return;
    }

    setRestoringBackupId(backup.id);
    setActionMessage("");
    setActionError("");

    try {
      const { response, data } = await fetchJson<{ message?: string }>(`${API_BASE_URL}/admin/backups/${backup.id}/restore`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actorUserId: user.id }),
      });

      if (!response.ok) {
        throw new Error(getApiMessage(data, "Failed to restore backup."));
      }

      setActionMessage(getApiMessage(data, "Backup restored successfully."));
      await loadAdminWorkspace();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Failed to restore backup.");
    } finally {
      setRestoringBackupId(null);
    }
  };

  function isHeadquarterBranch(branchName: string) {
    return /\bHQ\b/i.test(branchName);
  }

  function getHeadquartersForCountry(countryId: string) {
    if (!countryId) {
      return lookups.branches.filter((branch) => isHeadquarterBranch(branch.name));
    }

    const countryBranches = lookups.branches.filter((branch) => branch.country_id === Number(countryId));
    const explicitHeadquarters = countryBranches.filter((branch) => isHeadquarterBranch(branch.name));

    return explicitHeadquarters.length > 0 ? explicitHeadquarters : countryBranches;
  }

  function getDefaultHqId(countryId: string) {
    if (!countryId) {
      return "";
    }

    return String(getHeadquartersForCountry(countryId)[0]?.id || "");
  }

  const filteredHeadquartersForDepartment = getHeadquartersForCountry(departmentForm.countryId);

  const filteredBranchesForDepartment =
    departmentForm.countryId
      ? lookups.branches.filter((branch) => branch.country_id === Number(departmentForm.countryId))
      : [];

  const detectedPhoneCountry = useMemo(
    () => detectCountryFromPhoneInput(userForm.phoneNumber, lookups.countries),
    [lookups.countries, userForm.phoneNumber],
  );

  const filteredHeadquartersForUser = getHeadquartersForCountry(userForm.countryId);

  const filteredBranchesForUser =
    userForm.countryId
      ? lookups.branches.filter((branch) => branch.country_id === Number(userForm.countryId))
      : [];

  const selectedUserBranch = userForm.branchId
    ? lookups.branches.find((branch) => branch.id === Number(userForm.branchId))
    : null;

  const filteredDepartmentsForUser = userForm.branchId
    ? (() => {
        const departmentsByBranchId = lookups.departments.filter(
          (department) => department.branch_id === Number(userForm.branchId),
        );

        if (departmentsByBranchId.length > 0) {
          return departmentsByBranchId;
        }

        if (!selectedUserBranch) {
          return [];
        }

        return lookups.departments.filter(
          (department) =>
            department.country_id === selectedUserBranch.country_id &&
            department.branch_name.trim().toLowerCase() === selectedUserBranch.name.trim().toLowerCase(),
        );
      })()
    : lookups.departments;

  const filteredAdminUsers = useMemo(() => {
    const searchTerm = userSearch.trim().toLowerCase();

    return adminUsers.filter((account) => {
      const matchesSearch =
        !searchTerm ||
        account.full_name.toLowerCase().includes(searchTerm) ||
        account.email.toLowerCase().includes(searchTerm) ||
        account.role_name.toLowerCase().includes(searchTerm);

      const matchesStatus = userStatusFilter === "all" || account.status === userStatusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [adminUsers, userSearch, userStatusFilter]);

  const handleUserPhoneNumberChange = (phoneNumber: string) => {
    const detectedCountry = detectCountryFromPhoneInput(phoneNumber, lookups.countries);

    setUserForm((current) => {
      if (!detectedCountry) {
        return {
          ...current,
          phoneNumber,
        };
      }

      const nextCountryId = String(detectedCountry.id);
      const countryChanged = current.countryId !== nextCountryId;

      return {
        ...current,
        phoneNumber,
        countryId: nextCountryId,
        hqId: countryChanged ? "" : current.hqId,
        branchId: countryChanged ? "" : current.branchId,
        departmentId: countryChanged ? "" : current.departmentId,
      };
    });
  };

  const toastState = useMemo(() => {
    if (actionError) {
      return { message: actionError, type: "error" as const };
    }

    if (dashboardError) {
      return { message: dashboardError, type: "error" as const };
    }

    if (qrError) {
      return { message: qrError, type: "error" as const };
    }

    if (actionMessage) {
      return { message: actionMessage, type: "success" as const };
    }

    return null;
  }, [actionError, actionMessage, dashboardError, qrError]);

  useEffect(() => {
    if (!toastState) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setActionMessage("");
      setActionError("");
      setDashboardError("");
      setQrError("");
    }, 3200);

    return () => window.clearTimeout(timeout);
  }, [toastState]);

  const toggleSidebarGroup = (title: string) => {
    setExpandedGroups((current) => ({
      ...current,
      [title]: !current[title],
    }));
  };

  const handleSectionChange = (href: string) => {
    setActiveSection(href.replace("#", ""));
    if (window.innerWidth <= 980) {
      setIsSidebarOpen(false);
    }
  };

  const renderOverviewSection = () => (
    <>
      <section className="dashboard-card-grid" id="overview">
        {summaryCards.map((item) => {
          const config = summaryCardConfig[item.label] ?? {
            icon: ClipboardList,
            section: "users",
            actionLabel: "Open details",
          };

          return (
            <OverviewShortcutCard
              key={item.label}
              title={item.label}
              value={item.value}
              description={item.note}
              icon={config.icon}
              actionLabel={config.actionLabel}
              onClick={() => setActiveSection(config.section)}
            />
          );
        })}

        <OverviewShortcutCard
          title="Users"
          value={adminUsers.length}
          description="Live user accounts currently available in the system."
          icon={Users}
          actionLabel="Open users"
          onClick={() => setActiveSection("users")}
        />

        <OverviewShortcutCard
          title="Locations"
          value={lookups.countries.length + lookups.branches.length + lookups.departments.length}
          description="Combined country, branch, and department records created by admin."
          icon={Globe2}
          actionLabel="Manage locations"
          onClick={() => setActiveSection("countries")}
        />

        <OverviewShortcutCard
          title="Assets"
          value={reports.assetMetrics.totalAssets}
          description="Track equipment health, assignment readiness, and stock posture."
          icon={Boxes}
          actionLabel="Open reports"
          onClick={() => setActiveSection("reports")}
        />

        <OverviewShortcutCard
          title="Requests"
          value={reports.requestMetrics.totalRequests}
          description="Review request pipeline volume and recent fulfillment activity."
          icon={BarChart3}
          actionLabel="Open reports"
          onClick={() => setActiveSection("reports")}
        />

        <OverviewShortcutCard
          title="Policies"
          value={approvalPolicyForm.branchManagerRole ? 4 : 0}
          description="Control approval roles and system alert thresholds from one place."
          icon={Settings2}
          actionLabel="Open controls"
          onClick={() => setActiveSection("policies")}
        />

        <OverviewShortcutCard
          title="Backups"
          value={systemControls.backups.length}
          description="Create recovery snapshots and restore the system when needed."
          icon={RefreshCcw}
          actionLabel="Open backup"
          onClick={() => setActiveSection("backup")}
        />
      </section>

    </>
  );

  const renderUsersSection = () => (
    <section className="dashboard-panel wide-panel" id="users">
      <div className="panel-header">
        <h3>User Management</h3>
        <div className="panel-header-actions">
          <span>{adminUsers.length} accounts</span>
          <button
            className="secondary-btn compact-btn"
            type="button"
            onClick={() => {
              if (isUserFormOpen) {
                resetUserForm();
                return;
              }

              setIsUserFormOpen(true);
            }}
          >
            {isUserFormOpen ? "Hide form" : "Add user"}
          </button>
        </div>
      </div>

      {isUserFormOpen ? (
        <div className="toggle-form-panel">
          <form className="admin-form-grid" onSubmit={handleCreateUser}>
            <label className="field">
              <span>First name</span>
              <input
                value={userForm.firstName}
                onChange={(event) => setUserForm({ ...userForm, firstName: event.target.value })}
                required
              />
            </label>
            <label className="field">
              <span>Last name</span>
              <input
                value={userForm.lastName}
                onChange={(event) => setUserForm({ ...userForm, lastName: event.target.value })}
                required
              />
            </label>
            <label className="field">
              <span>Email</span>
              <input
                type="email"
                value={userForm.email}
                onChange={(event) => setUserForm({ ...userForm, email: event.target.value })}
                required
              />
            </label>
            <label className="field">
              <span>Airtel phone number</span>
              <input
                type="tel"
                value={userForm.phoneNumber}
                onChange={(event) => handleUserPhoneNumberChange(event.target.value)}
                placeholder="0712345678 or +250712345678"
              />
            </label>
            <label className="field">
              <span>Role</span>
              <select
                value={userForm.roleId}
                onChange={(event) => setUserForm({ ...userForm, roleId: event.target.value })}
                required
              >
                <option value="">Select role</option>
                {lookups.roles.map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Employee code</span>
              <input
                value={userForm.employeeCode}
                onChange={(event) => setUserForm({ ...userForm, employeeCode: event.target.value })}
              />
            </label>
            <label className="field">
              <span>Job title</span>
              <input
                value={userForm.jobTitle}
                onChange={(event) => setUserForm({ ...userForm, jobTitle: event.target.value })}
                placeholder="Network Engineer"
              />
            </label>
            <label className="field">
              <span>Employment status</span>
              <select
                value={userForm.employmentStatus}
                onChange={(event) => setUserForm({ ...userForm, employmentStatus: event.target.value })}
              >
                <option value="">Select employment status</option>
                {employmentStatusOptions.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Office location</span>
              <input
                value={userForm.officeLocation}
                onChange={(event) => setUserForm({ ...userForm, officeLocation: event.target.value })}
                placeholder="Kigali HQ - 3rd Floor"
              />
            </label>
            <label className="field">
              <span>Start date</span>
              <input
                type="date"
                value={userForm.startDate}
                onChange={(event) => setUserForm({ ...userForm, startDate: event.target.value })}
              />
            </label>
            <label className="field">
              <span>Country</span>
              <select
                value={userForm.countryId}
                onChange={(event) =>
                  setUserForm({
                    ...userForm,
                    countryId: event.target.value,
                    hqId: getDefaultHqId(event.target.value),
                    branchId: "",
                    departmentId: "",
                  })
                }
                required
              >
                <option value="">Select country</option>
                {lookups.countries.map((country) => (
                  <option key={country.id} value={country.id}>
                    {country.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>HQ</span>
              <select
                value={userForm.hqId}
                onChange={(event) =>
                  setUserForm({
                    ...userForm,
                    hqId: event.target.value,
                    branchId: "",
                    departmentId: "",
                  })
                }
                disabled={!userForm.countryId}
                required
              >
                <option value="">Select HQ</option>
                {filteredHeadquartersForUser.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Branch</span>
              <select
                value={userForm.branchId}
                onChange={(event) =>
                  setUserForm({
                    ...userForm,
                    branchId: event.target.value,
                    departmentId: "",
                  })
                }
                disabled={!userForm.countryId}
                required
              >
                <option value="">Select branch</option>
                {filteredBranchesForUser.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Department</span>
              <select
                value={userForm.departmentId}
                onChange={(event) => setUserForm({ ...userForm, departmentId: event.target.value })}
              >
                <option value="">Select department</option>
                {filteredDepartmentsForUser.map((department) => (
                  <option key={department.id} value={department.id}>
                    {department.name}
                  </option>
                ))}
              </select>
            </label>
            <div className="form-action-row field-span-2">
              <button className="primary-btn form-submit-btn" type="submit">
                {editingUserId ? "Update User" : "Create User"}
              </button>
              {editingUserId ? (
                <button className="secondary-btn compact-btn" type="button" onClick={resetUserForm}>
                  Cancel edit
                </button>
              ) : null}
            </div>
          </form>
        </div>
      ) : null}

      {qrError ? <p className="form-message error-text">{qrError}</p> : null}

      <div className="subpanel-header">
        <h4>Created Users</h4>
        <div className="panel-toolbar">
          <input
            className="table-search-input"
            type="search"
            value={userSearch}
            onChange={(event) => setUserSearch(event.target.value)}
            placeholder="Search name, email, or role"
          />
          <select
            className="table-filter-select"
            value={userStatusFilter}
            onChange={(event) => setUserStatusFilter(event.target.value)}
          >
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="pending">Pending approval</option>
            <option value="inactive">Inactive</option>
          </select>
          <button
            className="secondary-btn compact-btn export-btn"
            type="button"
            onClick={() => void handleExportUsers()}
            disabled={isExportingUsers}
          >
            <Download size={16} />
            {isExportingUsers ? "Exporting..." : "Export Document"}
          </button>
          <button
            className="secondary-btn compact-btn"
            type="button"
            onClick={() => setIsUserListOpen((current) => !current)}
          >
            {isUserListOpen ? "Hide users" : "Show users"}
          </button>
        </div>
      </div>

      {isUserListOpen ? (
        (() => {
          const usersPageKey = "users-admin-list";
          const usersPageSize = pageSizeByKey[usersPageKey] || DEFAULT_ITEMS_PER_PAGE;
          const usersTotalPages = Math.max(Math.ceil(filteredAdminUsers.length / usersPageSize), 1);
          const usersCurrentPage = Math.min(reportPageByKey[usersPageKey] || 1, usersTotalPages);
          const paginatedAdminUsers = paginateRows(filteredAdminUsers, usersCurrentPage, usersPageSize);

          return (
        <div className="user-table compact-table">
          <div className="user-table-head">
            <span>Name</span>
            <span>Email</span>
            <span>Role</span>
            <span>Status</span>
            <span>Actions</span>
          </div>
          {paginatedAdminUsers.map((account) => (
            <div className="user-table-row" key={account.id}>
              <div className="user-primary-cell">
                <strong>{account.full_name}</strong>
              </div>
              <div className="user-secondary-cell">
                <strong>{account.email}</strong>
              </div>
              <span>{account.role_name}</span>
              <span className={`status-badge status-${account.status}`}>{account.status}</span>
              <div className="table-action-group">
                {account.status === "pending" ? (
                  <button
                    className="table-action table-action-success"
                    type="button"
                    onClick={() => void handleApproveUser(account.id)}
                    disabled={approvingUserId === account.id}
                  >
                    {approvingUserId === account.id ? "Approving..." : "Approve"}
                  </button>
                ) : (
                  <button
                    className="table-action"
                    type="button"
                    onClick={() => void handleEditUser(account)}
                  >
                    Edit
                  </button>
                )}
                <button
                  className="table-action"
                  type="button"
                  onClick={() => void handleResendWelcomeEmail(account)}
                  disabled={resendLoadingUserId === account.id}
                >
                  {resendLoadingUserId === account.id ? "Sending..." : "Resend email"}
                </button>
                <button
                  className="table-action"
                  type="button"
                  onClick={() => void handleAdminResetPassword(account)}
                  disabled={resetPasswordLoadingUserId === account.id}
                >
                  {resetPasswordLoadingUserId === account.id ? "Resetting..." : "Reset password"}
                </button>
                <button
                  className={`table-action ${account.status === "active" ? "table-action-danger" : "table-action-success"}`}
                  type="button"
                  onClick={() => void handleUserStatusChange(account.id, account.status === "active" ? "inactive" : "active")}
                  disabled={statusLoadingUserId === account.id}
                >
                  {statusLoadingUserId === account.id
                    ? "Updating..."
                    : account.status === "active"
                      ? "Set inactive"
                      : "Set active"}
                </button>
                <button
                  className="table-action table-action-danger"
                  type="button"
                  onClick={() => void handleDeleteUser(account)}
                  disabled={deleteLoadingUserId === account.id || account.id === user.id}
                  title={account.id === user.id ? "You cannot delete your own account." : undefined}
                >
                  {deleteLoadingUserId === account.id ? "Deleting..." : "Delete"}
                </button>
              </div>
            </div>
          ))}
          {filteredAdminUsers.length === 0 ? <p className="loading-text">No users match the current search.</p> : null}
          {renderPaginationBar(usersPageKey, filteredAdminUsers.length, usersCurrentPage, usersPageSize, (page) =>
            setReportPageByKey((current) => ({
              ...current,
              [usersPageKey]: page,
            }))
          )}
        </div>
          );
        })()
      ) : null}
    </section>
  );

  const renderRolesSection = () => {
    const rolesPageKey = "roles-list";
    const rolesPageSize = pageSizeByKey[rolesPageKey] || DEFAULT_ITEMS_PER_PAGE;
    const rolesTotalPages = Math.max(Math.ceil(lookups.roles.length / rolesPageSize), 1);
    const rolesCurrentPage = Math.min(reportPageByKey[rolesPageKey] || 1, rolesTotalPages);
    const paginatedRoles = paginateRows(lookups.roles, rolesCurrentPage, rolesPageSize);

    return (
      <section className="dashboard-panel" id="roles">
        <div className="panel-header">
          <h3>Roles</h3>
          <span>{lookups.roles.length} records</span>
        </div>
        <form className="simple-form" onSubmit={handleCreateRole}>
          <label className="field">
            <span>Role name</span>
            <input value={roleForm.name} onChange={(event) => setRoleForm({ ...roleForm, name: event.target.value })} required />
          </label>
          <label className="field">
            <span>Description</span>
            <input value={roleForm.description} onChange={(event) => setRoleForm({ ...roleForm, description: event.target.value })} />
          </label>
          <button className="primary-btn form-submit-btn" type="submit">
            Add Role
          </button>
        </form>
        <div className="mini-list">
          {paginatedRoles.map((role) => (
            <article className="mini-list-card" key={role.id}>
              <strong>{role.name}</strong>
              <span>{role.description || "No description"}</span>
            </article>
          ))}
        </div>
        {renderPaginationBar(rolesPageKey, lookups.roles.length, rolesCurrentPage, rolesPageSize, (page) =>
          setReportPageByKey((current) => ({
            ...current,
            [rolesPageKey]: page,
          }))
        )}
      </section>
    );
  };

  const renderReportsSection = () => (
    (() => {
      const recentAssetsPageKey = "reports-recent-assets";
      const recentAssetsPageSize = pageSizeByKey[recentAssetsPageKey] || DEFAULT_ITEMS_PER_PAGE;
      const recentAssetsTotalPages = Math.max(Math.ceil(reports.recentAssets.length / recentAssetsPageSize), 1);
      const recentAssetsCurrentPage = Math.min(reportPageByKey[recentAssetsPageKey] || 1, recentAssetsTotalPages);
      const paginatedRecentAssets = paginateRows(reports.recentAssets, recentAssetsCurrentPage, recentAssetsPageSize);

      const recentRequestsPageKey = "reports-recent-requests";
      const recentRequestsPageSize = pageSizeByKey[recentRequestsPageKey] || DEFAULT_ITEMS_PER_PAGE;
      const recentRequestsTotalPages = Math.max(Math.ceil(reports.recentRequests.length / recentRequestsPageSize), 1);
      const recentRequestsCurrentPage = Math.min(reportPageByKey[recentRequestsPageKey] || 1, recentRequestsTotalPages);
      const paginatedRecentRequests = paginateRows(reports.recentRequests, recentRequestsCurrentPage, recentRequestsPageSize);

      return (
        <section className="dashboard-panel wide-panel" id="reports">
          <div className="panel-header">
            <h3>Operational Reports</h3>
            <div className="panel-header-actions">
              <button
                className="secondary-btn compact-btn export-btn"
                type="button"
                onClick={() => void handleExportAssets()}
                disabled={isExportingAssets}
              >
                <Download size={16} />
                {isExportingAssets ? "Exporting assets..." : "Export asset document"}
              </button>
              <button
                className="secondary-btn compact-btn export-btn"
                type="button"
                onClick={() => void handleExportRequests()}
                disabled={isExportingRequests}
              >
                <Download size={16} />
                {isExportingRequests ? "Exporting requests..." : "Export request document"}
              </button>
            </div>
          </div>

          <div className="report-summary-grid">
            <article className="report-card">
              <p className="metric-kicker">Assets</p>
              <strong>{reports.assetMetrics.totalAssets}</strong>
              <p>Available: {reports.assetMetrics.availableAssets}</p>
              <p>Assigned: {reports.assetMetrics.assignedAssets}</p>
              <p>Maintenance: {reports.assetMetrics.maintenanceAssets}</p>
              <p>Retired / Lost: {reports.assetMetrics.retiredAssets + reports.assetMetrics.lostAssets}</p>
            </article>
            <article className="report-card">
              <p className="metric-kicker">Requests</p>
              <strong>{reports.requestMetrics.totalRequests}</strong>
              <p>Pending: {reports.requestMetrics.pendingRequests}</p>
              <p>Approved: {reports.requestMetrics.approvedRequests}</p>
              <p>Rejected: {reports.requestMetrics.rejectedRequests}</p>
              <p>Fulfilled: {reports.requestMetrics.fulfilledRequests}</p>
            </article>
            <article className="report-card">
              <p className="metric-kicker">Assignments</p>
              <strong>{reports.assignmentMetrics.activeAssignments}</strong>
              <p>Active assignments now in use</p>
              <p>Returned: {reports.assignmentMetrics.returnedAssignments}</p>
              <p>Overdue: {reports.assignmentMetrics.overdueAssignments}</p>
            </article>
            <article className="report-card">
              <p className="metric-kicker">Issues</p>
              <strong>{reports.issueMetrics.openIssues}</strong>
              <p>Open operational issues being tracked</p>
              <p>High priority: {reports.issueMetrics.highPriorityIssues}</p>
            </article>
          </div>

          <div className="dashboard-bottom-row report-bottom-grid">
            <div className="report-panel">
              <div className="subpanel-header">
                <h4>Recent Assets</h4>
                <span>{reports.recentAssets.length} records</span>
              </div>
              <div className="report-list">
                {paginatedRecentAssets.map((asset) => (
                  (() => {
                    const depreciation = getDepreciationSnapshot({
                      purchaseCost: asset.purchase_cost,
                      purchaseDate: asset.purchase_date,
                      purchaseYear: asset.purchase_year,
                      lifespanYears: asset.lifespan_years,
                    });

                    return (
                      <article className="report-list-card" key={asset.id}>
                        <div className="report-list-head">
                          <strong>{asset.asset_tag}</strong>
                          <span className={`status-badge status-${asset.status}`}>{asset.status}</span>
                        </div>
                        <p>{asset.equipment_name}</p>
                        <div className="audit-log-meta">
                          <span>{asset.category_name || "Uncategorized"}</span>
                          <span>{asset.branch_name || "No location"}</span>
                        </div>
                        <div className="audit-log-meta">
                          <span>
                            Annual depreciation: {depreciation ? formatCurrencyAmount(depreciation.annualDepreciation) : "Unavailable"}
                          </span>
                          <span>
                            Book value: {depreciation ? formatCurrencyAmount(depreciation.bookValue) : "Unavailable"}
                          </span>
                        </div>
                      </article>
                    );
                  })()
                ))}
                {reports.recentAssets.length === 0 ? <p className="loading-text">No assets available yet.</p> : null}
              </div>
              {renderPaginationBar(recentAssetsPageKey, reports.recentAssets.length, recentAssetsCurrentPage, recentAssetsPageSize, (page) =>
                setReportPageByKey((current) => ({
                  ...current,
                  [recentAssetsPageKey]: page,
                }))
              )}
            </div>

            <div className="report-panel">
              <div className="subpanel-header">
                <h4>Recent Requests</h4>
                <span>{reports.recentRequests.length} records</span>
              </div>
              <div className="report-list">
                {paginatedRecentRequests.map((request) => (
                  <article className="report-list-card" key={request.id}>
                    <div className="report-list-head">
                      <strong>Request #{request.id}</strong>
                      <span className={`status-badge status-${request.request_status}`}>{request.request_status}</span>
                    </div>
                    <p>{request.category_name}</p>
                    <div className="audit-log-meta">
                      <span>{request.requester_name}</span>
                      <span>{new Date(request.created_at).toLocaleDateString()}</span>
                    </div>
                  </article>
                ))}
                {reports.recentRequests.length === 0 ? <p className="loading-text">No requests available yet.</p> : null}
              </div>
              {renderPaginationBar(recentRequestsPageKey, reports.recentRequests.length, recentRequestsCurrentPage, recentRequestsPageSize, (page) =>
                setReportPageByKey((current) => ({
                  ...current,
                  [recentRequestsPageKey]: page,
                }))
              )}
            </div>
          </div>
        </section>
      );
    })()
  );

  const renderPoliciesSection = () => (
    <section className="dashboard-panel wide-panel" id="policies">
      <div className="panel-header">
        <h3>System Policies</h3>
        <span>Workflow and threshold controls</span>
      </div>

      <div className="dashboard-bottom-row report-bottom-grid">
        <div className="report-panel">
          <div className="subpanel-header">
            <h4>Approval Workflow</h4>
          </div>
          <p className="dashboard-subtitle">
            Choose which role handles each step in the request approval and fulfillment chain.
          </p>
          <form className="simple-form" onSubmit={handleSaveApprovalPolicy}>
            <label className="field">
              <span>Branch manager step</span>
              <input
                value={approvalPolicyForm.branchManagerRole}
                onChange={(event) =>
                  setApprovalPolicyForm({ ...approvalPolicyForm, branchManagerRole: event.target.value })
                }
                required
              />
            </label>
            <label className="field">
              <span>HR step</span>
              <input
                value={approvalPolicyForm.hrRole}
                onChange={(event) => setApprovalPolicyForm({ ...approvalPolicyForm, hrRole: event.target.value })}
                required
              />
            </label>
            <label className="field">
              <span>IT step</span>
              <input
                value={approvalPolicyForm.itRole}
                onChange={(event) => setApprovalPolicyForm({ ...approvalPolicyForm, itRole: event.target.value })}
                required
              />
            </label>
            <label className="field">
              <span>Fulfillment step</span>
              <input
                value={approvalPolicyForm.storekeeperRole}
                onChange={(event) =>
                  setApprovalPolicyForm({ ...approvalPolicyForm, storekeeperRole: event.target.value })
                }
                required
              />
            </label>
            <button className="primary-btn form-submit-btn export-btn" type="submit" disabled={isSavingApprovalPolicy}>
              <Save size={16} />
              {isSavingApprovalPolicy ? "Saving..." : "Save workflow"}
            </button>
          </form>
        </div>

        <div className="report-panel">
          <div className="subpanel-header">
            <h4>Alert Thresholds</h4>
          </div>
          <p className="dashboard-subtitle">
            Define when the admin should consider stock, overdue usage, and high-priority issues urgent.
          </p>
          <form className="simple-form" onSubmit={handleSaveAlertThresholds}>
            <label className="field">
              <span>Low stock threshold</span>
              <input
                type="number"
                min="0"
                value={alertThresholdForm.lowStockThreshold}
                onChange={(event) =>
                  setAlertThresholdForm({ ...alertThresholdForm, lowStockThreshold: event.target.value })
                }
                required
              />
            </label>
            <label className="field">
              <span>Overdue assignment days</span>
              <input
                type="number"
                min="0"
                value={alertThresholdForm.overdueAssignmentDays}
                onChange={(event) =>
                  setAlertThresholdForm({ ...alertThresholdForm, overdueAssignmentDays: event.target.value })
                }
                required
              />
            </label>
            <label className="field">
              <span>High-priority issue threshold</span>
              <input
                type="number"
                min="0"
                value={alertThresholdForm.highPriorityIssueThreshold}
                onChange={(event) =>
                  setAlertThresholdForm({ ...alertThresholdForm, highPriorityIssueThreshold: event.target.value })
                }
                required
              />
            </label>
            <div className="policy-alert-preview">
              <span className="status-badge status-pending">Low stock at {systemControls.alertThresholds.lowStockThreshold}</span>
              <span className="status-badge status-assigned">Overdue after {systemControls.alertThresholds.overdueAssignmentDays} days</span>
              <span className="status-badge status-lost">Escalate at {systemControls.alertThresholds.highPriorityIssueThreshold} issues</span>
            </div>
            <button className="primary-btn form-submit-btn export-btn" type="submit" disabled={isSavingAlertThresholds}>
              <TriangleAlert size={16} />
              {isSavingAlertThresholds ? "Saving..." : "Save thresholds"}
            </button>
          </form>
        </div>
      </div>
    </section>
  );

  const renderBackupSection = () => (
    (() => {
      const backupsPageKey = "backup-snapshots";
      const backupsPageSize = pageSizeByKey[backupsPageKey] || DEFAULT_ITEMS_PER_PAGE;
      const backupsTotalPages = Math.max(Math.ceil(systemControls.backups.length / backupsPageSize), 1);
      const backupsCurrentPage = Math.min(reportPageByKey[backupsPageKey] || 1, backupsTotalPages);
      const paginatedBackups = paginateRows(systemControls.backups, backupsCurrentPage, backupsPageSize);

      return (
    <section className="dashboard-panel wide-panel" id="backup">
      <div className="panel-header">
        <h3>Backup And Recovery</h3>
        <div className="panel-header-actions">
          <span>{systemControls.backups.length} snapshots</span>
          <button className="primary-btn compact-btn export-btn" type="button" onClick={() => void handleCreateBackup()} disabled={isCreatingBackup}>
            <RefreshCcw size={16} />
            {isCreatingBackup ? "Creating..." : "Create backup"}
          </button>
        </div>
      </div>
      <p className="dashboard-subtitle">
        Generate a JSON snapshot of the main system tables, download it for safekeeping, or restore a previous state when recovery is needed.
      </p>
      <div className="report-list">
        {paginatedBackups.map((backup) => (
          <article className="report-list-card" key={backup.id}>
            <div className="report-list-head">
              <strong>{backup.label}</strong>
              <span className={`status-badge status-${backup.snapshot_status}`}>{backup.snapshot_status}</span>
            </div>
            <div className="audit-log-meta">
              <span>Created: {new Date(backup.created_at).toLocaleString()}</span>
              <span>By: {backup.created_by_name || "System"}</span>
              <span>File: {backup.file_name}</span>
              <span>
                Restored: {backup.restored_at ? new Date(backup.restored_at).toLocaleString() : "Not yet"}
              </span>
            </div>
            <div className="table-action-group backup-action-group">
              <button
                className="table-action"
                type="button"
                onClick={() => void handleDownloadBackup(backup)}
                disabled={downloadingBackupId === backup.id}
              >
                {downloadingBackupId === backup.id ? "Downloading..." : "Download"}
              </button>
              <button
                className="table-action table-action-danger"
                type="button"
                onClick={() => void handleRestoreBackup(backup)}
                disabled={restoringBackupId === backup.id}
              >
                {restoringBackupId === backup.id ? "Restoring..." : "Restore"}
              </button>
            </div>
          </article>
        ))}
        {systemControls.backups.length === 0 ? <p className="loading-text">No backup snapshots created yet.</p> : null}
      </div>
      {renderPaginationBar(backupsPageKey, systemControls.backups.length, backupsCurrentPage, backupsPageSize, (page) =>
        setReportPageByKey((current) => ({
          ...current,
          [backupsPageKey]: page,
        }))
      )}
    </section>
      );
    })()
  );

  const renderAuditSection = () => (
    (() => {
      const auditPageKey = "audit-log-list";
      const auditPageSize = pageSizeByKey[auditPageKey] || DEFAULT_ITEMS_PER_PAGE;
      const auditTotalPages = Math.max(Math.ceil(auditLogs.length / auditPageSize), 1);
      const auditCurrentPage = Math.min(reportPageByKey[auditPageKey] || 1, auditTotalPages);
      const paginatedAuditLogs = paginateRows(auditLogs, auditCurrentPage, auditPageSize);

      return (
    <section className="dashboard-panel wide-panel" id="audit">
      <div className="panel-header">
        <h3>Audit Trail</h3>
        <div className="panel-header-actions">
          <span>{auditLogs.length} recent events</span>
          <button
            className="secondary-btn compact-btn export-btn"
            type="button"
            onClick={() => void handleExportAuditLogs()}
            disabled={isExportingAuditLogs}
          >
            <Download size={16} />
            {isExportingAuditLogs ? "Exporting..." : "Export Document"}
          </button>
        </div>
      </div>
      <div className="audit-log-list">
        {paginatedAuditLogs.map((log) => (
          <article className="audit-log-card" key={log.id}>
            <div className="audit-log-head">
              <strong>{log.action_label}</strong>
              <span>{new Date(log.created_at).toLocaleString()}</span>
            </div>
            <p>{log.details || "No extra details."}</p>
            <div className="audit-log-meta">
              <span>Actor: {log.actor_name || log.actor_email || "System"}</span>
              <span>Target: {log.target_name || log.target_email || "N/A"}</span>
            </div>
          </article>
        ))}
        {auditLogs.length === 0 ? <p className="loading-text">No audit activity recorded yet.</p> : null}
      </div>
      {renderPaginationBar(auditPageKey, auditLogs.length, auditCurrentPage, auditPageSize, (page) =>
        setReportPageByKey((current) => ({
          ...current,
          [auditPageKey]: page,
        }))
      )}
    </section>
      );
    })()
  );

  const renderPermissionsSection = () => {
    const permissionsPageKey = "permissions-list";
    const permissionsPageSize = pageSizeByKey[permissionsPageKey] || DEFAULT_ITEMS_PER_PAGE;
    const permissionsTotalPages = Math.max(Math.ceil(lookups.permissions.length / permissionsPageSize), 1);
    const permissionsCurrentPage = Math.min(reportPageByKey[permissionsPageKey] || 1, permissionsTotalPages);
    const paginatedPermissions = paginateRows(lookups.permissions, permissionsCurrentPage, permissionsPageSize);

    return (
      <section className="dashboard-panel" id="permissions">
        <div className="panel-header">
          <h3>Permissions</h3>
          <span>{lookups.permissions.length} records</span>
        </div>
        <form className="simple-form" onSubmit={handleCreatePermission}>
          <label className="field">
            <span>Code</span>
            <input
              value={permissionForm.code}
              onChange={(event) => setPermissionForm({ ...permissionForm, code: event.target.value })}
              required
            />
          </label>
          <label className="field">
            <span>Name</span>
            <input
              value={permissionForm.name}
              onChange={(event) => setPermissionForm({ ...permissionForm, name: event.target.value })}
              required
            />
          </label>
          <label className="field">
            <span>Module</span>
            <input
              value={permissionForm.moduleName}
              onChange={(event) => setPermissionForm({ ...permissionForm, moduleName: event.target.value })}
              required
            />
          </label>
          <button className="primary-btn form-submit-btn" type="submit">
            Add Permission
          </button>
        </form>
        <div className="mini-list">
          {paginatedPermissions.map((permission) => (
            <article className="mini-list-card" key={permission.id}>
              <strong>{permission.name}</strong>
              <span>{permission.code} / {permission.module_name}</span>
            </article>
          ))}
        </div>
        {renderPaginationBar(permissionsPageKey, lookups.permissions.length, permissionsCurrentPage, permissionsPageSize, (page) =>
          setReportPageByKey((current) => ({
            ...current,
            [permissionsPageKey]: page,
          }))
        )}
      </section>
    );
  };

  const renderSettingsSection = () => <AccountSettingsPanel user={user} onUserUpdate={onUserUpdate} />;

  const renderCountriesSection = () => {
    const countriesPageKey = "countries-list";
    const countriesPageSize = pageSizeByKey[countriesPageKey] || DEFAULT_ITEMS_PER_PAGE;
    const countriesTotalPages = Math.max(Math.ceil(lookups.countries.length / countriesPageSize), 1);
    const countriesCurrentPage = Math.min(reportPageByKey[countriesPageKey] || 1, countriesTotalPages);
    const paginatedCountries = paginateRows(lookups.countries, countriesCurrentPage, countriesPageSize);

    return (
      <section className="dashboard-panel" id="countries">
        <div className="panel-header">
          <h3>Countries</h3>
          <span>{lookups.countries.length} records</span>
        </div>
        <div className="country-seed-panel">
          <p className="dashboard-subtitle">
            Use the prepared Airtel country list, then choose from the dropdowns in branch,
            department, and user forms instead of adding countries one by one.
          </p>
          <button className="primary-btn form-submit-btn" type="button" onClick={handleSeedCountries}>
            Load Airtel Countries
          </button>
        </div>
        <div className="mini-list">
          {paginatedCountries.map((country) => (
            <article className="mini-list-card" key={country.id}>
              <strong>{country.name}</strong>
              <span>{country.iso_code}{country.currency_code ? ` / ${country.currency_code}` : ""}</span>
            </article>
          ))}
        </div>
        {renderPaginationBar(countriesPageKey, lookups.countries.length, countriesCurrentPage, countriesPageSize, (page) =>
          setReportPageByKey((current) => ({
            ...current,
            [countriesPageKey]: page,
          }))
        )}
      </section>
    );
  };

  const renderBranchesSection = () => {
    const branchesPageKey = "branches-list";
    const branchesPageSize = pageSizeByKey[branchesPageKey] || DEFAULT_ITEMS_PER_PAGE;
    const branchesTotalPages = Math.max(Math.ceil(lookups.branches.length / branchesPageSize), 1);
    const branchesCurrentPage = Math.min(reportPageByKey[branchesPageKey] || 1, branchesTotalPages);
    const paginatedBranches = paginateRows(lookups.branches, branchesCurrentPage, branchesPageSize);

    return (
      <section className="dashboard-panel" id="branches">
      <div className="panel-header">
        <h3>Branches</h3>
        <span>{lookups.branches.length} records</span>
      </div>
      <div className="country-seed-panel">
        <p className="dashboard-subtitle">
          Load a prepared Airtel branch list so users and departments can choose from many branches.
        </p>
        <button className="primary-btn form-submit-btn" type="button" onClick={handleSeedBranches}>
          Load Airtel Branches
        </button>
      </div>
      <form className="simple-form" onSubmit={handleCreateBranch}>
        <label className="field">
          <span>Branch name</span>
          <input value={branchForm.name} onChange={(event) => setBranchForm({ ...branchForm, name: event.target.value })} required />
        </label>
        <label className="field">
          <span>Branch code</span>
          <input
            value={branchForm.branchCode}
            onChange={(event) => setBranchForm({ ...branchForm, branchCode: event.target.value })}
            required
          />
        </label>
        <label className="field">
          <span>Country</span>
          <select
            value={branchForm.countryId}
            onChange={(event) => setBranchForm({ ...branchForm, countryId: event.target.value })}
            required
          >
            <option value="">Select country</option>
            {lookups.countries.map((country) => (
              <option key={country.id} value={country.id}>
                {country.name}
              </option>
            ))}
          </select>
        </label>
        <button className="primary-btn form-submit-btn" type="submit">
          Add Branch
        </button>
      </form>
      <div className="mini-list">
        {paginatedBranches.map((branch) => (
          <article className="mini-list-card" key={branch.id}>
            <strong>{branch.name}</strong>
            <span>{branch.branch_code} / {branch.country_name}</span>
          </article>
        ))}
      </div>
      {renderPaginationBar(branchesPageKey, lookups.branches.length, branchesCurrentPage, branchesPageSize, (page) =>
        setReportPageByKey((current) => ({
          ...current,
          [branchesPageKey]: page,
        }))
      )}
    </section>
    );
  };

  const renderDepartmentsSection = () => {
    const departmentsPageKey = "departments-list";
    const departmentsPageSize = pageSizeByKey[departmentsPageKey] || DEFAULT_ITEMS_PER_PAGE;
    const departmentsTotalPages = Math.max(Math.ceil(lookups.departments.length / departmentsPageSize), 1);
    const departmentsCurrentPage = Math.min(reportPageByKey[departmentsPageKey] || 1, departmentsTotalPages);
    const paginatedDepartments = paginateRows(lookups.departments, departmentsCurrentPage, departmentsPageSize);

    return (
      <section className="dashboard-panel" id="departments">
      <div className="panel-header">
        <h3>Departments</h3>
        <span>{lookups.departments.length} records</span>
      </div>
      <form className="simple-form" onSubmit={handleCreateDepartment}>
        <label className="field">
          <span>Department name</span>
          <input
            value={departmentForm.name}
            onChange={(event) => setDepartmentForm({ ...departmentForm, name: event.target.value })}
            required
          />
        </label>
        <label className="field">
          <span>Country</span>
          <select
            value={departmentForm.countryId}
            onChange={(event) =>
              setDepartmentForm({
                ...departmentForm,
                countryId: event.target.value,
                hqId: getDefaultHqId(event.target.value),
                branchId: "",
              })
            }
            required
          >
            <option value="">Select country</option>
            {lookups.countries.map((country) => (
              <option key={country.id} value={country.id}>
                {country.name}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>HQ</span>
          <select
            value={departmentForm.hqId}
            onChange={(event) => setDepartmentForm({ ...departmentForm, hqId: event.target.value, branchId: "" })}
            disabled={!departmentForm.countryId}
            required
          >
            <option value="">Select HQ</option>
            {filteredHeadquartersForDepartment.map((branch) => (
              <option key={branch.id} value={branch.id}>
                {branch.name}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Branch</span>
          <select
            value={departmentForm.branchId}
            onChange={(event) => setDepartmentForm({ ...departmentForm, branchId: event.target.value })}
            disabled={!departmentForm.countryId}
            required
          >
            <option value="">Select branch</option>
            {filteredBranchesForDepartment.map((branch) => (
              <option key={branch.id} value={branch.id}>
                {branch.name}
              </option>
            ))}
          </select>
        </label>
        <button className="primary-btn form-submit-btn" type="submit">
          Add Department
        </button>
      </form>
      <div className="mini-list">
        {paginatedDepartments.map((department) => (
          <article className="mini-list-card" key={department.id}>
            <strong>{department.name}</strong>
            <span>{department.branch_name} / {department.country_name}</span>
          </article>
        ))}
      </div>
      {renderPaginationBar(departmentsPageKey, lookups.departments.length, departmentsCurrentPage, departmentsPageSize, (page) =>
        setReportPageByKey((current) => ({
          ...current,
          [departmentsPageKey]: page,
        }))
      )}
    </section>
    );
  };

  const renderAdminTablesSection = () => (
    <section className="dashboard-panel" id="admin-tables">
      <div className="panel-header">
        <h3>Admin Data Scope</h3>
      </div>
      <div className="table-list">
        <article className="table-card">
          <h3>users</h3>
          <p>Create admin-managed user accounts and assign them to real roles.</p>
          <small>Connected to live MySQL records</small>
        </article>
        <article className="table-card">
          <h3>roles / permission</h3>
          <p>Define access layers and action-level privileges from this dashboard.</p>
          <small>Role and permission forms are active</small>
        </article>
        <article className="table-card">
          <h3>country / branches / department</h3>
          <p>Build the organization structure before assigning users and assets.</p>
          <small>Location hierarchy is functional</small>
        </article>
      </div>
    </section>
  );

  const renderModulesSection = () => {
    const modulesPageKey = "modules-list";
    const modulesPageSize = pageSizeByKey[modulesPageKey] || DEFAULT_ITEMS_PER_PAGE;
    const modulesTotalPages = Math.max(Math.ceil(moduleSummary.length / modulesPageSize), 1);
    const modulesCurrentPage = Math.min(reportPageByKey[modulesPageKey] || 1, modulesTotalPages);
    const paginatedModules = paginateRows(moduleSummary, modulesCurrentPage, modulesPageSize);

    return (
      <section className="dashboard-panel" id="modules">
        <div className="panel-header">
          <h3>Platform Modules</h3>
        </div>
        <div className="module-grid module-grid-compact">
          {paginatedModules.map((module) => (
            <article className="module-card" key={module.name}>
              <h3>{module.name}</h3>
              <p>{module.value}</p>
            </article>
          ))}
        </div>
        {renderPaginationBar(modulesPageKey, moduleSummary.length, modulesCurrentPage, modulesPageSize, (page) =>
          setReportPageByKey((current) => ({
            ...current,
            [modulesPageKey]: page,
          }))
        )}
      </section>
    );
  };

  const renderQrSection = () => (
    <section className="dashboard-panel" id="qr-panel">
      <div className="panel-header">
        <h3>User QR</h3>
      </div>
      {selectedQrUser && qrImageUrl ? (
        <div className="qr-card stacked-qr-card">
          <div className="qr-preview">
            <img src={qrImageUrl} alt={`${selectedQrUser.fullName} QR code`} />
          </div>
          <div className="qr-details">
            <p>
              <strong>Name:</strong> {selectedQrUser.fullName}
            </p>
            <p>
              <strong>Employee Code:</strong> {selectedQrUser.employeeCode || "Not assigned"}
            </p>
            <p>
              <strong>Role:</strong> {selectedQrUser.role}
            </p>
            <button className="primary-btn qr-download-btn" type="button" onClick={handleDownloadQr}>
              Download QR
            </button>
          </div>
        </div>
      ) : (
        <p className="loading-text">Select a user to preview their QR code.</p>
      )}
    </section>
  );

  const renderActiveSection = () => {
    switch (activeSection) {
      case "users":
        return renderUsersSection();
      case "reports":
        return renderReportsSection();
      case "policies":
        return renderPoliciesSection();
      case "backup":
        return renderBackupSection();
      case "audit":
        return renderAuditSection();
      case "roles":
        return renderRolesSection();
      case "permissions":
        return renderPermissionsSection();
      case "countries":
        return renderCountriesSection();
      case "branches":
        return renderBranchesSection();
      case "departments":
        return renderDepartmentsSection();
      case "admin-tables":
        return renderAdminTablesSection();
      case "modules":
        return renderModulesSection();
      case "qr-panel":
        return renderQrSection();
      case "settings":
        return renderSettingsSection();
      case "overview":
      default:
        return renderOverviewSection();
    }
  };

  return (
    <div className={`app-dashboard-shell ${isSidebarOpen ? "sidebar-open" : "sidebar-collapsed"}`}>
      <aside className={`dashboard-sidebar ${isSidebarOpen ? "is-open" : "is-collapsed"}`}>
        <div className="sidebar-brand">
          <AirtelLogo />
        </div>

        <div className="sidebar-user">
          <strong>
            {user.firstName} {user.lastName}
          </strong>
          <span>{user.role.toLowerCase()}</span>
        </div>

        <nav className="sidebar-nav">
          {sidebarGroups.map((group) => (
            <section className="sidebar-group" key={group.title}>
              <button
                className="sidebar-group-button"
                type="button"
                onClick={() => toggleSidebarGroup(group.title)}
                aria-expanded={expandedGroups[group.title]}
              >
                <span className="sidebar-group-title">
                  <span className="sidebar-icon" aria-hidden="true">
                    <group.icon size={16} strokeWidth={2.2} />
                  </span>
                  <span>{group.title}</span>
                </span>
                <span
                  className={`sidebar-chevron ${expandedGroups[group.title] ? "is-open" : ""}`}
                  aria-hidden="true"
                >
                  <ChevronDown size={16} strokeWidth={2.4} />
                </span>
              </button>
              <div className={`sidebar-group-links ${expandedGroups[group.title] ? "is-open" : "is-closed"}`}>
                {group.links.map((link) => {
                  const sectionId = link.href.replace("#", "");
                  const isActive = activeSection === sectionId;

                  return (
                    <button
                      className={`sidebar-link sidebar-link-button ${isActive ? "is-active" : ""}`}
                      type="button"
                      onClick={() => handleSectionChange(link.href)}
                      key={link.label}
                    >
                      <span className="sidebar-link-icon" aria-hidden="true">
                        <link.icon size={15} strokeWidth={2.2} />
                      </span>
                      <span className="sidebar-link-label">{link.label}</span>
                    </button>
                  );
                })}
              </div>
            </section>
          ))}
        </nav>
      </aside>

      <div className="dashboard-stage">
        <header className="dashboard-topbar">
          <div className="dashboard-topbar-left">
            <button
              className="menu-badge"
              type="button"
              aria-label="Toggle menu"
              onClick={() => setIsSidebarOpen((current) => !current)}
            >
              =
            </button>
            <h1>Airtel Inventory Management System</h1>
          </div>
          <div className="dashboard-topbar-right">
            <UserMenu user={user} onOpenProfile={() => setActiveSection("settings")} onLogout={onLogout} />
          </div>
        </header>

        <main className="dashboard-content">
          <div className="dashboard-heading-row">
            <div>
              <h2>
                {activeSection === "overview"
                  ? "Dashboard"
                  : activeSection
                      .split("-")
                      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
                      .join(" ")}
              </h2>
              <p className="dashboard-subtitle">
                Manage admin content section by section instead of troubleshooting one long page.
              </p>
            </div>
            <div className="dashboard-breadcrumb">
              <span>Home</span>
              <span>/</span>
              <span>Admin Dashboard</span>
              <span>/</span>
              <span>
                {activeSection === "overview"
                  ? "Overview"
                  : activeSection
                      .split("-")
                      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
                      .join(" ")}
              </span>
            </div>
          </div>

          {toastState ? (
            <DashboardToast
              message={toastState.message}
              type={toastState.type}
              onClose={() => {
                setActionMessage("");
                setActionError("");
                setDashboardError("");
                setQrError("");
              }}
            />
          ) : null}

          <div className="section-view-shell">
            {isDashboardLoading ? (
              <DashboardWaveLoader
                title="Loading admin dashboard"
                description="Collecting users, assets, reports, and system controls for the latest admin view."
              />
            ) : (
              renderActiveSection()
            )}
          </div>
        </main>

        <footer className="dashboard-footer">
          <p>Copyright 2026 Airtel IMS. All rights reserved.</p>
          <span>Version 1.0.0</span>
        </footer>
      </div>
    </div>
  );
}

export default AdminDashboardPage;
