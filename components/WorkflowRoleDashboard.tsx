import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import type { LucideIcon } from "lucide-react";
import QRCode from "qrcode";
import {
  Bell,
  Boxes,
  Building2,
  ChevronDown,
  CheckCheck,
  ClipboardCheck,
  Download,
  FileChartColumn,
  FolderInput,
  LayoutDashboard,
  PackageCheck,
  RotateCcw,
  Send,
  ShieldCheck,
  TimerReset,
  TriangleAlert,
  UserCog,
  UserRound,
  Users,
  Warehouse,
  Wrench,
} from "lucide-react";
import AccountSettingsPanel from "./AccountSettingsPanel";
import AirtelLogo from "./AirtelLogo";
import DashboardWaveLoader from "./DashboardWaveLoader";
import DashboardToast from "./DashboardToast";
import OverviewShortcutCard from "./OverviewShortcutCard";
import UserMenu from "./UserMenu";
import { fetchJson, getApiMessage } from "../api";
import { API_BASE_URL } from "../config";
import type { LoggedInUser } from "../types";

type RoleView = "branch-manager" | "hr" | "it-manager" | "it-support" | "employee";
type StockControlView = "available" | "returned" | "retired";

type WorkflowStep = {
  id: number;
  request_id: number;
  step_key: string;
  step_label: string;
  actor_role: string;
  actor_user_id: number | null;
  action_status: "pending" | "approved" | "rejected" | "fulfilled" | "returned";
  action_note: string | null;
  acted_at: string | null;
  actor_name: string | null;
};

type RequestRow = {
  id: number;
  requester_id: number;
  category_id: number;
  approver_id: number | null;
  request_status: "pending" | "approved" | "rejected" | "fulfilled";
  request_type?: "standard" | "new_hire" | "replacement" | "loss_theft";
  target_employee_user_id?: number | null;
  source_request_id?: number | null;
  source_equipment_id?: number | null;
  replacement_disposition?: "available" | "retired" | null;
  replacement_condition_status?: string | null;
  report_type?: "loss" | "theft" | null;
  booked_equipment_id?: number | null;
  final_security_approval_status?: "pending" | "approved" | "rejected";
  final_security_approved_at?: string | null;
  hrms_snapshot?: HrmsSnapshot | string | null;
  fulfillment_status: "ready" | "waiting_stock" | "backordered" | "on_hold" | "fulfilled";
  fulfillment_note: string | null;
  fulfillment_updated_at: string | null;
  clarification_status?: "none" | "needed";
  clarification_note?: string | null;
  clarification_requested_by?: number | null;
  clarification_requested_at?: string | null;
  clarification_target_user_id?: number | null;
  clarification_target_role?: string | null;
  notes: string | null;
  created_at: string;
  requested_at: string;
  requester_name: string;
  requester_email: string;
  requester_department_name: string | null;
  requester_job_title: string | null;
  requester_employment_status: string | null;
  requester_office_location: string | null;
  requester_start_date: string | null;
  requester_branch_id: number | null;
  requester_country_id: number | null;
  category_name: string;
  branch_name: string | null;
  country_name: string | null;
  approver_name: string | null;
  target_employee_name?: string | null;
  target_employee_email?: string | null;
  target_employee_code?: string | null;
  target_employee_phone_number?: string | null;
  target_employee_job_title?: string | null;
  target_employee_employment_status?: string | null;
  target_employee_office_location?: string | null;
  target_employee_start_date?: string | null;
  target_employee_grade?: string | null;
  target_employee_hrms_employee_id?: string | null;
  target_employee_role_name?: string | null;
  target_employee_department_name?: string | null;
  workflowSteps: WorkflowStep[];
  currentStageKey: string;
  currentStageLabel: string;
};

type AssignmentRow = {
  id: number;
  equipment_id: number;
  employee_user_id: number;
  assigned_by: number;
  assigned_at: string;
  expected_return_date: string | null;
  status: "active" | "returned" | "overdue";
  receipt_status: "pending" | "received";
  received_confirmed_at: string | null;
  receipt_note: string | null;
  notes: string | null;
  asset_tag: string;
  equipment_name: string;
  serial_number: string;
  computer_name: string | null;
  vendor_name: string | null;
  model_name: string | null;
  purchase_date: string | null;
  purchase_year: number | null;
  purchase_cost: number | null;
  location_details: string | null;
  device_health: string | null;
  warranty_end_date: string | null;
  lifespan_years: number | null;
  equipment_specs: EquipmentSpecs | string | null;
  category_name: string | null;
  branch_name: string | null;
  country_name: string | null;
  employee_name: string;
  employee_email: string;
  employee_job_title: string | null;
  employee_employment_status: string | null;
  employee_office_location: string | null;
  employee_start_date: string | null;
  assigned_by_name: string;
  replacement_request_id?: number | null;
  replacement_request_status?: "pending" | "approved" | "rejected" | "fulfilled" | null;
  replacement_disposition?: "available" | "retired" | null;
  replacement_condition_status?: string | null;
  replacement_processed_at?: string | null;
};

type ReturnRow = {
  id: number;
  assignment_id: number;
  equipment_id: number;
  employee_user_id: number;
  requested_by: number;
  received_by?: number | null;
  return_reason?: "standard" | "leaving_job" | null;
  it_manager_user_id: number | null;
  storekeeper_user_id: number | null;
  request_note: string | null;
  it_review_note: string | null;
  intake_note: string | null;
  received_condition_comment?: string | null;
  condition_status: string | null;
  disposition: string | null;
  return_status: "it_review" | "store_intake" | "awaiting_final_approval" | "returned_to_employee" | "requested" | "completed" | "rejected" | "maintenance";
  final_hrd_approval_status?: "pending" | "approved" | "rejected";
  final_hrd_approved_at?: string | null;
  final_itd_approval_status?: "pending" | "approved" | "rejected";
  final_itd_approved_at?: string | null;
  requested_at: string;
  returned_at?: string | null;
  it_reviewed_at: string | null;
  processed_at: string | null;
  asset_tag: string;
  equipment_name: string;
  employee_name: string;
  employee_email: string;
  employee_job_title: string | null;
  employee_employment_status: string | null;
  employee_office_location: string | null;
  employee_start_date: string | null;
  received_by_name?: string | null;
  it_manager_name: string | null;
  storekeeper_name: string | null;
};

type EquipmentRow = {
  id: number;
  asset_tag: string;
  serial_number: string;
  computer_name: string | null;
  equipment_name: string;
  status: "available" | "assigned" | "maintenance" | "retired" | "lost" | "replaced";
  category_id: number;
  branch_id: number | null;
  country_id: number | null;
  vendor_name: string | null;
  model_name: string | null;
  purchase_date: string | null;
  purchase_year: number | null;
  purchase_cost: number | null;
  location_details: string | null;
  device_health: string | null;
  warranty_end_date: string | null;
  lifespan_years: number | null;
  equipment_specs: EquipmentSpecs | string | null;
  replacement_request_id?: number | null;
  replacement_request_status?: "pending" | "approved" | "rejected" | "fulfilled" | null;
  replacement_disposition?: "available" | "retired" | null;
  replacement_condition_status?: string | null;
  replacement_processed_at?: string | null;
  category_name: string | null;
  branch_name: string | null;
  country_name: string | null;
};

type CategoryRow = {
  id: number;
  name: string;
  depreciation_rate: number;
};

type DetailEntityType = "request" | "equipment" | "assignment" | "employee" | "return" | "issue" | "maintenance";

type DetailPanelState = {
  type: DetailEntityType;
  title: string;
  subtitle: string;
  rows: Array<{ label: string; value: string }>;
  qrEquipment?: EquipmentRow | null;
};

type ReplacementRiskInsight = {
  score: number;
  recommendation: string;
  reasons: string[];
  observedOutcome: string;
};

type IssueRow = {
  id: number;
  equipment_id: number;
  reported_by: number;
  issue_title: string;
  issue_description: string | null;
  priority: string;
  issue_status: string;
  created_at: string;
  asset_tag: string;
  equipment_name: string;
  reported_by_name: string;
};

type EmployeeRow = {
  id: number;
  employee_code?: string | null;
  full_name: string;
  first_name?: string;
  last_name?: string;
  email: string;
  phone_number?: string | null;
  job_title: string | null;
  employment_status: string | null;
  office_location: string | null;
  start_date: string | null;
  status?: string;
  hrms_employee_id?: string | null;
  employee_grade?: string | null;
  branch_id: number | null;
  country_id: number | null;
  department_id: number | null;
  branch_name: string | null;
  country_name: string | null;
  department_name: string | null;
};

type MaintenanceRecord = {
  id: number;
  equipment_id: number;
  return_id: number | null;
  reported_by: number | null;
  assigned_to: number | null;
  maintenance_status: "under_repair" | "repaired" | "not_repairable";
  condition_status: string | null;
  problem_description: string | null;
  resolution_note: string | null;
  final_disposition: string | null;
  started_at: string;
  completed_at: string | null;
  asset_tag: string;
  equipment_name: string;
  branch_id: number | null;
  country_id: number | null;
  branch_name: string | null;
  country_name: string | null;
  reported_by_name: string | null;
  employee_name: string | null;
};

type LifecycleEvent = {
  id: number;
  equipment_id: number;
  actor_user_id: number | null;
  event_type: string;
  event_label: string;
  event_note: string | null;
  from_status: string | null;
  to_status: string | null;
  related_record_type: string | null;
  related_record_id: number | null;
  created_at: string;
  asset_tag: string;
  equipment_name: string;
  actor_name: string | null;
};

type SmartAlert = {
  severity: "info" | "warning" | "critical";
  title: string;
  message: string;
};

type NotificationRow = {
  id: number;
  title: string;
  message: string | null;
  status: string;
  created_at: string;
};

type ReportCount = {
  label: string;
  total: number;
};

type WorkflowDashboardData = {
  currentUser?: LoggedInUser;
  categories: CategoryRow[];
  equipment: EquipmentRow[];
  requests: RequestRow[];
  employees: EmployeeRow[];
  assignments: AssignmentRow[];
  returns: ReturnRow[];
  issues: IssueRow[];
  maintenanceRecords: MaintenanceRecord[];
  lifecycleEvents: LifecycleEvent[];
  smartAlerts: SmartAlert[];
  notifications: NotificationRow[];
  reports: {
    requestStatus: ReportCount[];
    equipmentStatus: ReportCount[];
    assignmentStatus: ReportCount[];
    roleCounts: Array<{ role_name: string; total: number }>;
  };
};

type StockForm = {
  assetTag: string;
  serialNumber: string;
  computerName: string;
  equipmentName: string;
  categoryId: string;
  vendorName: string;
  modelName: string;
  cpu: string;
  status: string;
  ram: string;
  storageCapacity: string;
  storageType: string;
  osVersion: string;
  purchaseYear: string;
  purchaseCost: string;
  purchaseDate: string;
  locationDetails: string;
  deviceHealth: string;
  warrantyEndDate: string;
  lifespanYears: string;
  includedAccessories: string[];
  accessoryNotes: string;
};

type RequestFormState = {
  categoryId: string;
  requestType: "standard" | "new_hire" | "replacement" | "loss_theft";
  targetEmployeeUserId: string;
  expectedDeviceSpecs: string;
  notes: string;
  requestDate: string;
  sourceEquipmentId: string;
  reportType: "loss" | "theft";
  incidentScope: "during_work" | "outside_work";
};

type HrmsSnapshot = {
  requesterId?: number | null;
  targetEmployeeUserId?: number | null;
  employeeCode?: string | null;
  employeeName?: string | null;
  employeeEmail?: string | null;
  roleName?: string | null;
  employeeGrade?: string | null;
  hrmsEmployeeId?: string | null;
  jobTitle?: string | null;
  employmentStatus?: string | null;
  officeLocation?: string | null;
  startDate?: string | null;
  expectedDeviceSpecs?: string | null;
};

type EmployeeFormState = {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  employeeCode: string;
  hrmsEmployeeId: string;
  employeeGrade: string;
  jobTitle: string;
  employmentStatus: string;
  officeLocation: string;
  startDate: string;
  status: "active" | "inactive" | "pending";
};

type EquipmentSpecs = {
  cpu?: string;
  ram?: string;
  storage?: string;
  storageCapacity?: string;
  storageType?: string;
  processor?: string;
  osVersion?: string;
  operatingSystem?: string;
  accessories?: string[];
  accessoryNotes?: string;
};

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

type WorkflowRoleDashboardProps = {
  user: LoggedInUser;
  onLogout: () => void;
  onUserUpdate: (user: LoggedInUser) => void;
  roleView: RoleView;
};

type TimelineFilter = "all" | "pending" | "approved" | "rejected" | "fulfilled";

type FulfillmentStatus = "ready" | "waiting_stock" | "backordered" | "on_hold";
type ReplacementDisposition = "available" | "retired";

const openFulfillmentStatuses = new Set(["waiting_stock", "backordered", "on_hold"]);
const storageDeviceCategoryNames = new Set(["laptop", "desktop", "smartphone", "phone", "mobile phone", "tablet"]);
const DEFAULT_ITEMS_PER_PAGE = 3;
const PAGE_SIZE_OPTIONS = [3, 6, 9];
const equipmentAccessoryMap: Record<string, string[]> = {
  desktop: ["CPU / system unit", "Mouse", "Keyboard", "Screen"],
  laptop: ["Bag"],
};

function isReplacementAssignment(assignment: AssignmentRow) {
  return Boolean(assignment.replacement_request_id);
}

const roleConfigs: Record<
  RoleView,
  {
    title: string;
    chipLabel: string;
    subtitle: string;
    sidebarGroups: SidebarGroup[];
  }
> = {
  "branch-manager": {
    title: "Branch Manager Dashboard",
    chipLabel: "Branch Manager",
    subtitle: "Approve branch requests, watch branch assets, and follow local fulfillment.",
    sidebarGroups: [
      {
        title: "Branch Dashboard",
        icon: LayoutDashboard,
        links: [
          { label: "Overview", href: "#overview", icon: ClipboardCheck },
          { label: "Approvals", href: "#approvals", icon: ShieldCheck },
          { label: "Timeline", href: "#timeline", icon: FileChartColumn },
        ],
      },
      {
        title: "Branch Assets",
        icon: Building2,
        links: [
          { label: "Assets", href: "#assets", icon: Warehouse },
          { label: "Employees", href: "#employees", icon: Users },
          { label: "Reports", href: "#reports", icon: FileChartColumn },
        ],
      },
      {
        title: "Settings",
        icon: UserCog,
        links: [
          { label: "Settings", href: "#settings", icon: UserCog },
        ],
      },
    ],
  },
  hr: {
    title: "HR Recruitment Officer Dashboard",
    chipLabel: "HR Recruitment Officer",
    subtitle: "Review employee requests, verify staffing context, and watch approval throughput.",
    sidebarGroups: [
      {
        title: "HR Recruitment Workspace",
        icon: Users,
        links: [
          { label: "Overview", href: "#overview", icon: ClipboardCheck },
          { label: "Approvals", href: "#approvals", icon: ShieldCheck },
          { label: "Employees", href: "#employees", icon: UserRound },
          { label: "New Request", href: "#new-request", icon: Send },
          { label: "My Requests", href: "#my-requests", icon: FolderInput },
          { label: "Timeline", href: "#timeline", icon: FileChartColumn },
        ],
      },
      {
        title: "HR Reports",
        icon: FileChartColumn,
        links: [{ label: "Reports", href: "#reports", icon: FileChartColumn }],
      },
      {
        title: "Settings",
        icon: UserCog,
        links: [
          { label: "Settings", href: "#settings", icon: UserCog },
        ],
      },
    ],
  },
  "it-manager": {
    title: "IT Manager Dashboard",
    chipLabel: "IT Manager",
    subtitle: "Approve technical requests, monitor issues, and keep equipment lifecycle healthy.",
    sidebarGroups: [
      {
        title: "IT Workspace",
        icon: Wrench,
        links: [
          { label: "Overview", href: "#overview", icon: ClipboardCheck },
          { label: "Approvals", href: "#approvals", icon: ShieldCheck },
          { label: "Return Checks", href: "#returns", icon: RotateCcw },
          { label: "Equipment", href: "#equipment", icon: Warehouse },
          { label: "Timeline", href: "#timeline", icon: FileChartColumn },
        ],
      },
      {
        title: "IT Reports",
        icon: FileChartColumn,
        links: [{ label: "Reports", href: "#reports", icon: FileChartColumn }],
      },
      {
        title: "Settings",
        icon: UserCog,
        links: [
          { label: "Notifications", href: "#notifications", icon: Bell },
          { label: "Settings", href: "#settings", icon: UserCog },
        ],
      },
    ],
  },
  "it-support": {
    title: "IT Support Engineer Dashboard",
    chipLabel: "IT Support Engineer",
    subtitle: "See approved requests, assign available stock, process returns, and track issued equipment.",
    sidebarGroups: [
      {
        title: "Store Operations",
        icon: PackageCheck,
        links: [
          { label: "Overview", href: "#overview", icon: ClipboardCheck },
          { label: "Approvals", href: "#approvals", icon: ShieldCheck },
          { label: "Fulfillment", href: "#fulfillment", icon: FolderInput },
          { label: "Returns", href: "#returns", icon: RotateCcw },
          { label: "Stock", href: "#stock", icon: Boxes },
          { label: "Timeline", href: "#timeline", icon: FileChartColumn },
        ],
      },
      {
        title: "Store Reports",
        icon: FileChartColumn,
        links: [{ label: "Reports", href: "#reports", icon: FileChartColumn }],
      },
      {
        title: "Settings",
        icon: UserCog,
        links: [
          { label: "Notifications", href: "#notifications", icon: Bell },
          { label: "Settings", href: "#settings", icon: UserCog },
        ],
      },
    ],
  },
  employee: {
    title: "Employee Dashboard",
    chipLabel: "Employee",
    subtitle: "Request new equipment, follow every approval step, and see what is assigned to you.",
    sidebarGroups: [
      {
        title: "My Workspace",
        icon: UserRound,
        links: [
          { label: "Overview", href: "#overview", icon: ClipboardCheck },
          { label: "New Request", href: "#new-request", icon: FolderInput },
          { label: "My Requests", href: "#my-requests", icon: ShieldCheck },
          { label: "My Equipment", href: "#my-equipment", icon: Warehouse },
          { label: "Return Requests", href: "#return-requests", icon: RotateCcw },
          { label: "Timeline", href: "#timeline", icon: FileChartColumn },
        ],
      },
      {
        title: "My Reports",
        icon: FileChartColumn,
        links: [{ label: "Reports", href: "#reports", icon: FileChartColumn }],
      },
      {
        title: "Settings",
        icon: UserCog,
        links: [
          { label: "Notifications", href: "#notifications", icon: Bell },
          { label: "Settings", href: "#settings", icon: UserCog },
        ],
      },
    ],
  },
};

function WorkflowRoleDashboard({ user, onLogout, onUserUpdate, roleView }: WorkflowRoleDashboardProps) {
  const todayDateValue = new Date().toISOString().slice(0, 10);
  const config = roleConfigs[roleView];
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [activeSection, setActiveSection] = useState("overview");
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(
    Object.fromEntries(config.sidebarGroups.map((group) => [group.title, true])),
  );
  const [dashboardData, setDashboardData] = useState<WorkflowDashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [pendingSubmitState, setPendingSubmitState] = useState<{ title: string; description: string } | null>(null);
  const [dashboardError, setDashboardError] = useState("");
  const [actionMessage, setActionMessage] = useState("");
  const [actionError, setActionError] = useState("");
  const [pendingRequestActionId, setPendingRequestActionId] = useState<number | null>(null);
  const [requestForm, setRequestForm] = useState<RequestFormState>({
    categoryId: "",
    requestType: roleView === "hr" ? "new_hire" : "standard",
    targetEmployeeUserId: "",
    expectedDeviceSpecs: "",
    notes: "",
    requestDate: todayDateValue,
    sourceEquipmentId: "",
    reportType: "loss",
    incidentScope: "during_work",
  });
  const [employeeForm, setEmployeeForm] = useState<EmployeeFormState>({
    firstName: "",
    lastName: "",
    email: "",
    phoneNumber: "",
    employeeCode: "",
    hrmsEmployeeId: "",
    employeeGrade: "",
    jobTitle: "",
    employmentStatus: "active",
    officeLocation: "",
    startDate: todayDateValue,
    status: "active",
  });
  const [editingEmployeeId, setEditingEmployeeId] = useState<number | null>(null);
  const [isEmployeeModalOpen, setIsEmployeeModalOpen] = useState(false);
  const [editingRequestId, setEditingRequestId] = useState<number | null>(null);
  const [approvalNotes, setApprovalNotes] = useState<Record<number, string>>({});
  const [fulfillmentForm, setFulfillmentForm] = useState<
    Record<
      number,
      {
        equipmentId: string;
        expectedReturnDate: string;
        note: string;
        fulfillmentStatus: FulfillmentStatus;
        replacementDisposition: ReplacementDisposition;
        replacementConditionStatus: string;
      }
    >
  >({});
  const [issueForm, setIssueForm] = useState({
    equipmentId: "",
    issueTitle: "",
    issueDescription: "",
    priority: "medium",
    issueStatus: "open",
  });
  const [editingIssueId, setEditingIssueId] = useState<number | null>(null);
  const [timelineFilter, setTimelineFilter] = useState<TimelineFilter>("all");
  const [requestSearchTerm, setRequestSearchTerm] = useState("");
  const [editingEquipmentId, setEditingEquipmentId] = useState<number | null>(null);
  const [isStockFormOpen, setIsStockFormOpen] = useState(false);
  const [isStockListOpen, setIsStockListOpen] = useState(true);
  const [stockControlView, setStockControlView] = useState<StockControlView>("available");
  const [requestPageByKey, setRequestPageByKey] = useState<Record<string, number>>({});
  const [returnPageByKey, setReturnPageByKey] = useState<Record<string, number>>({});
  const [pageSizeByKey, setPageSizeByKey] = useState<Record<string, number>>({});
  const [newStockCategoryName, setNewStockCategoryName] = useState("");
  const [selectedBranchEmployeeId, setSelectedBranchEmployeeId] = useState<number | null>(null);
  const [selectedDetailPanel, setSelectedDetailPanel] = useState<DetailPanelState | null>(null);
  const [selectedQrEquipment, setSelectedQrEquipment] = useState<EquipmentRow | null>(null);
  const [selectedQrAudience, setSelectedQrAudience] = useState<"employee" | "internal">("internal");
  const [equipmentQrImageUrl, setEquipmentQrImageUrl] = useState("");
  const [isEquipmentQrLoading, setIsEquipmentQrLoading] = useState(false);
  const [equipmentQrError, setEquipmentQrError] = useState("");
  const [selectedReportKey, setSelectedReportKey] = useState("");
  const [returnRequestNotes, setReturnRequestNotes] = useState<Record<number, string>>({});
  const [returnRequestReasons, setReturnRequestReasons] = useState<Record<number, "standard" | "leaving_job">>({});
  const [receiptNotes, setReceiptNotes] = useState<Record<number, string>>({});
  const [returnProcessForm, setReturnProcessForm] = useState<
    Record<number, { conditionStatus: string; disposition: string; intakeNote: string; action: "complete" | "reject" }>
  >({});
  const [itReturnReviewForm, setItReturnReviewForm] = useState<
    Record<number, { conditionStatus: string; disposition: string; reviewNote: string; action: "forward" | "return_to_employee" | "reject" }>
  >({});
  const [maintenanceCloseForm, setMaintenanceCloseForm] = useState<
    Record<number, { maintenanceStatus: "repaired" | "not_repairable"; finalDisposition: string; resolutionNote: string }>
  >({});
  const [finalReturnApprovalForm, setFinalReturnApprovalForm] = useState<
    Record<number, { decision: "approve" | "reject"; note: string }>
  >({});
  const [stockForm, setStockForm] = useState<StockForm>({
    assetTag: "",
    serialNumber: "",
    computerName: "",
    equipmentName: "",
    categoryId: "",
    vendorName: "",
    modelName: "",
    cpu: "",
    status: "available",
    ram: "",
    storageCapacity: "",
    storageType: "SSD",
    osVersion: "",
    purchaseYear: "",
    purchaseCost: "",
    purchaseDate: "",
    locationDetails: "",
    deviceHealth: "Healthy",
    warrantyEndDate: "",
    lifespanYears: "4",
    includedAccessories: [],
    accessoryNotes: "",
  });

  const loadDashboard = async () => {
    setIsLoading(true);
    setDashboardError("");

    try {
      const { response, data } = await fetchJson<WorkflowDashboardData>(`${API_BASE_URL}/workflow/dashboard?userId=${user.id}`);

      if (!response.ok) {
        throw new Error(getApiMessage(data, "Failed to load workflow dashboard."));
      }

      if (!data) {
        throw new Error("Workflow dashboard returned an empty response.");
      }

      setDashboardData(data);
    } catch (error) {
      setDashboardError(error instanceof Error ? error.message : "Dashboard load failed.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadDashboard();
  }, [user.id]);

  const categories = dashboardData?.categories ?? [];
  const equipment = dashboardData?.equipment ?? [];
  const requests = dashboardData?.requests ?? [];
  const employees = dashboardData?.employees ?? [];
  const assignments = dashboardData?.assignments ?? [];
  const returns = dashboardData?.returns ?? [];
  const issues = dashboardData?.issues ?? [];
  const maintenanceRecords = dashboardData?.maintenanceRecords ?? [];
  const lifecycleEvents = dashboardData?.lifecycleEvents ?? [];
  const smartAlerts = dashboardData?.smartAlerts ?? [];
  const notifications = dashboardData?.notifications ?? [];
  const [dismissedNotificationIds, setDismissedNotificationIds] = useState<number[]>([]);
  const unreadNotificationCount = notifications.filter((item) => item.status === "unread" && !dismissedNotificationIds.includes(item.id)).length;
  const currentUser = dashboardData?.currentUser ?? user;
  const selectedStockCategory = categories.find((category) => String(category.id) === stockForm.categoryId);
  const resolvedEquipmentName = selectedStockCategory?.name || stockForm.equipmentName.trim();
  const isStorageDeviceStockForm = selectedStockCategory
    ? storageDeviceCategoryNames.has(selectedStockCategory.name.toLowerCase())
    : false;

  const normalizeWorkflowLabel = (label: string) =>
    label === "HR Device Booking" ? "Device Booking" : label;

  const parseEquipmentSpecs = (value: EquipmentRow["equipment_specs"]): EquipmentSpecs => {
    if (!value) {
      return {};
    }

    if (typeof value === "string") {
      try {
        return JSON.parse(value) as EquipmentSpecs;
      } catch {
        return {};
      }
    }

    return value;
  };
  const parseHrmsSnapshot = (value: RequestRow["hrms_snapshot"]): HrmsSnapshot => {
    if (!value) {
      return {};
    }

    if (typeof value === "string") {
      try {
        return JSON.parse(value) as HrmsSnapshot;
      } catch {
        return {};
      }
    }

    return value;
  };
  const getRequiredAccessoriesForCategory = (categoryName: string | null | undefined) =>
    equipmentAccessoryMap[String(categoryName || "").trim().toLowerCase()] ?? [];
  const requiredStockAccessories = getRequiredAccessoriesForCategory(selectedStockCategory?.name);
  const hasRequiredAccessoryChecklist = requiredStockAccessories.length > 0;
  const formatEquipmentAccessories = (item: EquipmentRow) => {
    const specs = parseEquipmentSpecs(item.equipment_specs);
    return Array.isArray(specs.accessories) && specs.accessories.length > 0 ? specs.accessories.join(", ") : "";
  };
  const formatEquipmentAccessoryNotes = (item: EquipmentRow) => {
    const specs = parseEquipmentSpecs(item.equipment_specs);
    return specs.accessoryNotes?.trim() || "";
  };
  const formatEquipmentSpecs = (item: EquipmentRow) => {
    const specs = parseEquipmentSpecs(item.equipment_specs);
    const parts = [
      specs.cpu || specs.processor,
      specs.ram,
      specs.storageType && (specs.storageCapacity || specs.storage)
        ? `${specs.storageCapacity || specs.storage} ${specs.storageType}`.trim()
        : specs.storageCapacity || specs.storage,
      specs.osVersion || specs.operatingSystem,
    ].filter(Boolean);
    return parts.length > 0 ? parts.join(" / ") : "";
  };
  const formatAssignmentEquipmentSpecs = (assignment: AssignmentRow) =>
    formatEquipmentSpecs({
      id: assignment.equipment_id,
      asset_tag: assignment.asset_tag,
      serial_number: assignment.serial_number,
      computer_name: assignment.computer_name,
      equipment_name: assignment.equipment_name,
      status: "assigned",
      category_id: 0,
      branch_id: null,
      country_id: null,
      vendor_name: assignment.vendor_name,
      model_name: assignment.model_name,
      purchase_date: assignment.purchase_date,
      purchase_year: assignment.purchase_year,
      purchase_cost: assignment.purchase_cost,
      location_details: assignment.location_details,
      device_health: assignment.device_health,
      warranty_end_date: assignment.warranty_end_date,
      lifespan_years: assignment.lifespan_years,
      equipment_specs: assignment.equipment_specs,
      category_name: assignment.category_name,
      branch_name: assignment.branch_name,
      country_name: assignment.country_name,
    });
  const buildEquipmentRowFromAssignment = (assignment: AssignmentRow): EquipmentRow => ({
    id: assignment.equipment_id,
    asset_tag: assignment.asset_tag,
    serial_number: assignment.serial_number,
    computer_name: assignment.computer_name,
    equipment_name: assignment.equipment_name,
    status: assignment.status === "returned" && isReplacementAssignment(assignment) ? "replaced" : "assigned",
    category_id: 0,
    branch_id: null,
    country_id: null,
    vendor_name: assignment.vendor_name,
    model_name: assignment.model_name,
    purchase_date: assignment.purchase_date,
    purchase_year: assignment.purchase_year,
    purchase_cost: assignment.purchase_cost,
    location_details: assignment.location_details,
    device_health: assignment.device_health,
    warranty_end_date: assignment.warranty_end_date,
    lifespan_years: assignment.lifespan_years,
    equipment_specs: assignment.equipment_specs,
    category_name: assignment.category_name,
    branch_name: assignment.branch_name,
    country_name: assignment.country_name,
  });

  const employeeRequests = requests.filter(
    (request) => request.requester_id === user.id || request.target_employee_user_id === user.id,
  );
  const filteredEmployeeRequests = employeeRequests.filter((request) =>
    request.category_name.toLowerCase().includes(requestSearchTerm.trim().toLowerCase()),
  );
  const employeeAssignments = assignments.filter((assignment) => assignment.employee_user_id === user.id);
  const employeeReturnRequests = returns.filter((item) => item.employee_user_id === user.id);

  const branchRequests = requests.filter((request) => request.requester_branch_id === user.branchId);
  const branchEmployees = employees.filter((employee) => employee.branch_id === user.branchId);
  const branchEquipment = equipment.filter((item) => item.branch_id === user.branchId);
  const branchAssignmentMap = new Map(
    assignments
      .filter(
        (assignment) =>
          assignment.status === "active" &&
          branchEquipment.some((item) => item.id === assignment.equipment_id),
      )
      .map((assignment) => [assignment.equipment_id, assignment]),
  );
  const branchAssignedEquipment = branchEquipment.filter((item) => branchAssignmentMap.has(item.id));
  const branchAvailableEquipment = branchEquipment.filter((item) => !branchAssignmentMap.has(item.id));
  const branchEquipmentIds = new Set(branchEquipment.map((item) => item.id));
  const branchAssignments = assignments.filter((assignment) => branchEquipmentIds.has(assignment.equipment_id));
  const selectedBranchEmployeeAssignments = selectedBranchEmployeeId
    ? branchAssignments.filter((assignment) => assignment.employee_user_id === selectedBranchEmployeeId)
    : [];
  const selectedBranchEmployee = selectedBranchEmployeeAssignments[0] ?? null;
  const getAssignmentsForEmployee = (employeeId: number) =>
    assignments.filter((assignment) => assignment.employee_user_id === employeeId);

  const buildDetailPanel = (type: DetailEntityType, id: number): DetailPanelState | null => {
    if (type === "request") {
      const item = requests.find((request) => request.id === id);
      if (!item) {
        return null;
      }

      return {
        type,
        title: `Request #${item.id}`,
        subtitle: `${item.category_name} / ${item.request_status}`,
        rows: [
          { label: "Requester", value: item.requester_name },
          { label: "Type", value: (item.request_type || "standard").replace(/_/g, " ") },
          { label: "Current stage", value: normalizeWorkflowLabel(item.currentStageLabel) },
          { label: "Branch", value: item.branch_name || "No branch" },
          { label: "Requested", value: formatProfileDate(item.requested_at || item.created_at) },
          { label: "Note", value: item.notes || "No request note provided." },
        ],
      };
    }

    if (type === "equipment") {
      const item = equipment.find((record) => record.id === id);
      if (!item) {
        return null;
      }
      const risk = getEquipmentReplacementRisk(item);

      return {
        type,
        title: item.asset_tag,
        subtitle: `${item.equipment_name} / ${item.status}`,
        qrEquipment: item,
        rows: [
          { label: "Serial number", value: item.serial_number },
          { label: "Category", value: item.category_name || "Not set" },
          { label: "Branch", value: item.branch_name || "No branch" },
          { label: "Purchase date", value: formatProfileDate(item.purchase_date) },
          { label: "Depreciation", value: getEquipmentDepreciationSummary(item) },
          { label: "Replacement recommendation", value: `${risk.recommendation}: ${risk.score}%` },
          { label: "Risk factors", value: risk.reasons.join(" / ") },
          { label: "Observed outcome", value: risk.observedOutcome },
          { label: "Replacement target", value: getReplacementDate(item.purchase_date, item.lifespan_years, item.purchase_year) },
          { label: "Specs", value: formatEquipmentSpecs(item) || "Not set" },
        ],
      };
    }

    if (type === "assignment") {
      const item = assignments.find((record) => record.id === id);
      if (!item) {
        return null;
      }
      const assignmentEquipment = buildEquipmentRowFromAssignment(item);
      const risk = getEquipmentReplacementRisk(assignmentEquipment);

      return {
        type,
        title: item.asset_tag,
        subtitle: `${item.equipment_name} assigned to ${item.employee_name}`,
        qrEquipment: assignmentEquipment,
        rows: [
          { label: "Assignment status", value: item.status },
          { label: "Receipt", value: getAssignmentReceiptLabel(item) },
          { label: "Assigned date", value: formatProfileDate(item.assigned_at) },
          { label: "Expected return", value: formatProfileDate(item.expected_return_date) },
          { label: "Depreciation", value: getAssignmentDepreciationSummary(item) },
          { label: "Replacement recommendation", value: `${risk.recommendation}: ${risk.score}%` },
          { label: "Risk factors", value: risk.reasons.join(" / ") },
          { label: "Observed outcome", value: risk.observedOutcome },
          { label: "Specs", value: formatAssignmentEquipmentSpecs(item) || "Not set" },
        ],
      };
    }

    if (type === "employee") {
      const item = employees.find((record) => record.id === id);
      if (!item) {
        return null;
      }

      return {
        type,
        title: item.full_name,
        subtitle: item.email,
        rows: [
          { label: "Employee code", value: item.employee_code || "Not set" },
          { label: "Job title", value: item.job_title || "Not set" },
          { label: "Department", value: item.department_name || "Not set" },
          { label: "Office location", value: item.office_location || "Not set" },
          { label: "HRMS ID", value: item.hrms_employee_id || "Not set" },
          { label: "Start date", value: formatProfileDate(item.start_date) },
        ],
      };
    }

    return null;
  };

  const loadEquipmentQrPreview = async (item: EquipmentRow) => {
    setIsEquipmentQrLoading(true);
    setEquipmentQrError("");

    try {
      const audience = roleView === "employee" ? "employee" : "internal";
      const dataUrl = await QRCode.toDataURL(buildEquipmentQrPayload(item, audience), {
        width: 240,
        margin: 2,
        color: {
          dark: "#000000",
          light: "#ffffff",
        },
      });

      setSelectedQrEquipment(item);
      setSelectedQrAudience(audience);
      setEquipmentQrImageUrl(dataUrl);
      return dataUrl;
    } catch (error) {
      setEquipmentQrError(error instanceof Error ? error.message : "Failed to generate equipment QR code.");
      return "";
    } finally {
      setIsEquipmentQrLoading(false);
    }
  };

  const openDetailPanel = async (type: DetailEntityType, id: number) => {
    const detail = buildDetailPanel(type, id);
    if (!detail) {
      return;
    }

    setSelectedDetailPanel(detail);
    const nextUrl = new URL(window.location.href);
    nextUrl.searchParams.set("detail", encodeDetailToken(type, id));
    window.history.replaceState({}, "", `${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}`);

    if (detail.qrEquipment) {
      await loadEquipmentQrPreview(detail.qrEquipment);
    }
  };

  const closeDetailPanel = () => {
    setSelectedDetailPanel(null);
    const nextUrl = new URL(window.location.href);
    nextUrl.searchParams.delete("detail");
    window.history.replaceState({}, "", `${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}`);
  };

  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get("detail");

    if (!token) {
      setSelectedDetailPanel(null);
      return;
    }

    const decoded = decodeDetailToken(token);
    if (!decoded) {
      closeDetailPanel();
      return;
    }

    const detail = buildDetailPanel(decoded.type, decoded.id);
    if (!detail) {
      closeDetailPanel();
      return;
    }

    setSelectedDetailPanel(detail);
    if (detail.qrEquipment) {
      void loadEquipmentQrPreview(detail.qrEquipment);
    }
  }, [dashboardData]);

  useEffect(() => {
    if (activeSection !== "notifications") {
      return;
    }

    const unreadIds = notifications.filter((item) => item.status === "unread").map((item) => item.id);

    if (unreadIds.length === 0) {
      return;
    }

    setDismissedNotificationIds((current) => Array.from(new Set([...current, ...unreadIds])));
  }, [activeSection, notifications]);

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

  const requestSource =
    roleView === "employee"
      ? employeeRequests
      : roleView === "branch-manager"
        ? branchRequests
        : requests;

  const isLivePendingRequest = (request: RequestRow) =>
    request.request_status === "pending" ||
    (request.request_status === "approved" && openFulfillmentStatuses.has(request.fulfillment_status));

  const timelineRequests = requestSource.filter((request) => {
    if (timelineFilter === "all") {
      return true;
    }

    if (timelineFilter === "pending") {
      return isLivePendingRequest(request);
    }

    return request.request_status === timelineFilter;
  });

  const branchApprovals = branchRequests.filter(() => false);

  const hrApprovals = requests.filter((request) => {
    if (request.request_status !== "pending") {
      return false;
    }

    const pendingStep = request.workflowSteps.find((step) => step.action_status === "pending");
    return pendingStep?.actor_role === user.role;
  });

  const itSupportApprovals = requests.filter((request) => {
    if (request.request_status !== "pending") {
      return false;
    }

    const pendingStep = request.workflowSteps.find((step) => step.action_status === "pending");
    return pendingStep?.actor_role === user.role;
  });

  const itApprovals = requests.filter(
    (request) =>
      ["it_inventory_review", "itd_approval", "it_preparation", "security_review"].includes(request.currentStageKey) &&
      request.request_status === "pending",
  );

  const fulfillmentRequests = requests.filter(
    (request) =>
      request.request_status !== "fulfilled" &&
      request.request_status !== "rejected" &&
      (request.currentStageKey === "store_fulfillment" || openFulfillmentStatuses.has(request.fulfillment_status)),
  );
  const pendingItReturnReviews = returns.filter((item) => item.return_status === "it_review");
  const pendingFinalReturnApprovals = returns.filter((item) => {
    if (item.return_status !== "awaiting_final_approval") {
      return false;
    }

    if (roleView === "it-manager") {
      return user.role === "IT Director" && item.final_itd_approval_status !== "approved";
    }

    return false;
  });
  const openMaintenanceRecords = maintenanceRecords.filter(
    (item) => item.maintenance_status === "under_repair" && (!user.branchId || item.branch_id === user.branchId),
  );

  const availableEquipment = equipment.filter((item) => item.status === "available");
  const localAvailableEquipment = availableEquipment.filter((item) => !user.branchId || item.branch_id === user.branchId);
  const equipmentById = new Map(equipment.map((item) => [item.id, item]));
  const employeeActiveAssignmentOptions = employeeAssignments
    .filter((assignment) => assignment.status === "active")
    .map((assignment) => ({
      assignment,
      equipment: equipmentById.get(assignment.equipment_id) ?? null,
    }))
    .filter((item): item is { assignment: AssignmentRow; equipment: EquipmentRow } => item.equipment !== null);
  const disposedEquipment = equipment.filter(
    (item) =>
      (!user.branchId || item.branch_id === user.branchId) &&
      (item.status === "retired" || item.status === "lost"),
  );
  const returnedHoldingAssignments = assignments
    .filter((assignment) => assignment.status === "returned")
    .filter((assignment) => !isReplacementAssignment(assignment))
    .filter((assignment) => {
      const relatedEquipment = equipmentById.get(assignment.equipment_id);
      return relatedEquipment ? !user.branchId || relatedEquipment.branch_id === user.branchId : false;
    })
    .map((assignment) => ({
      assignment,
      equipment: equipmentById.get(assignment.equipment_id) ?? null,
    }))
    .filter((item) => item.equipment !== null);
  const pendingReturnIntake = returns.filter(
    (item) =>
      (item.return_status === "store_intake" || item.return_status === "requested") &&
      (() => {
        const relatedEquipment = equipmentById.get(item.equipment_id);
        return relatedEquipment ? !user.branchId || relatedEquipment.branch_id === user.branchId : false;
      })(),
  );

  const formatProfileDate = (value?: string | null) =>
    value ? new Date(value).toLocaleDateString() : "Not set";

  const formatReturnStatus = (status: ReturnRow["return_status"]) =>
    ({
      it_review: "Waiting for IT check",
      store_intake: "Waiting for IT support intake",
      awaiting_final_approval: "Waiting for HRD and ITD approval",
      maintenance: "Under maintenance",
      returned_to_employee: "Returned to employee",
      requested: "Waiting for IT support intake",
      completed: "Completed",
      rejected: "Rejected",
    })[status];

  const formatReturnReason = (reason?: ReturnRow["return_reason"]) =>
    reason === "leaving_job" ? "Employee leaving job" : "Standard return";

  const patchRequestInDashboard = (updatedRequest: RequestRow) => {
    setDashboardData((current) => {
      if (!current) {
        return current;
      }

      const nextRequests = current.requests.map((request) =>
        request.id === updatedRequest.id ? updatedRequest : request,
      );

      return {
        ...current,
        requests: nextRequests,
        reports: {
          ...current.reports,
          requestStatus: ["pending", "approved", "rejected", "fulfilled"].map((status) => ({
            label: status,
            total: nextRequests.filter((item) =>
              status === "pending" ? isLivePendingRequest(item) : item.request_status === status,
            ).length,
          })),
        },
      };
    });
  };

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

  const submitAction = async (
    method: "POST" | "PUT" | "DELETE",
    url: string,
    payload?: object,
    successMessage?: string,
    options?: {
      refreshDashboard?: boolean;
      onSuccess?: (data: any) => void;
    },
  ) => {
    setActionError("");
    setActionMessage("");

    const submitCopy = (() => {
      if (method === "POST" && url === "/requests") {
        return {
          title: "Submitting request",
          description: "Sending your request to Airtel IMS and preparing the next approval step.",
        };
      }

      if (url.includes("/returns")) {
        return {
          title: "Processing return",
          description: "Updating the return workflow and syncing the latest stock movement.",
        };
      }

      if (url.includes("/issues")) {
        return {
          title: "Saving issue update",
          description: "Recording the issue details and refreshing the latest support information.",
        };
      }

      return {
        title: "Processing request",
        description: "Saving your changes and refreshing the latest dashboard data.",
      };
    })();

    setPendingSubmitState(submitCopy);

    try {
      const { response, data } = await fetchJson<{ message?: string }>(`${API_BASE_URL}${url}`, {
        method,
        headers: payload ? { "Content-Type": "application/json" } : undefined,
        body: payload ? JSON.stringify(payload) : undefined,
      });

      if (!response.ok) {
        throw new Error(getApiMessage(data, "Action failed."));
      }

      setActionMessage(successMessage || getApiMessage(data, "Action completed."));
      options?.onSuccess?.(data);
      if (options?.refreshDashboard !== false) {
        await loadDashboard();
      }
      return data;
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Action failed.");
      return null;
    } finally {
      setPendingSubmitState(null);
    }
  };

  const formatQrDate = (value: string | null) => {
    if (!value) {
      return "Not set";
    }

    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "Not set" : date.toISOString().slice(0, 10);
  };

  const getReplacementDate = (purchaseDate: string | null, lifespanYears: number | null, purchaseYear?: number | null) => {
    if (!purchaseDate && !purchaseYear) {
      return "Not set";
    }

    const hasCompletePurchaseYear =
      typeof purchaseYear === "number" &&
      Number.isInteger(purchaseYear) &&
      purchaseYear >= 1000 &&
      purchaseYear <= 9999;

    const replacementDate = purchaseDate
      ? new Date(purchaseDate)
      : hasCompletePurchaseYear
        ? new Date(`${purchaseYear}-01-01T00:00:00`)
        : null;

    if (!replacementDate || Number.isNaN(replacementDate.getTime())) {
      return "Not set";
    }

    const safeLifespanYears =
      typeof lifespanYears === "number" && Number.isFinite(lifespanYears) && lifespanYears > 0
        ? lifespanYears
        : 4;

    replacementDate.setFullYear(replacementDate.getFullYear() + safeLifespanYears);

    if (Number.isNaN(replacementDate.getTime())) {
      return "Not set";
    }

    return replacementDate.toISOString().slice(0, 10);
  };

  const encodeDetailToken = (type: DetailEntityType, id: number) => {
    const checksum = id * 37 + type.length * 19;
    const raw = `${type}:${id}:${checksum}`;
    return window.btoa(raw).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
  };

  const decodeDetailToken = (token: string) => {
    try {
      const padded = token.replace(/-/g, "+").replace(/_/g, "/");
      const normalized = padded + "=".repeat((4 - (padded.length % 4 || 4)) % 4);
      const decoded = window.atob(normalized);
      const [type, idText, checksumText] = decoded.split(":");
      const id = Number(idText);
      const checksum = Number(checksumText);

      if (!["request", "equipment", "assignment", "employee", "return", "issue", "maintenance"].includes(type)) {
        return null;
      }

      if (!Number.isInteger(id) || checksum !== id * 37 + type.length * 19) {
        return null;
      }

      return { type: type as DetailEntityType, id };
    } catch {
      return null;
    }
  };

  const formatCurrencyAmount = (value: number | null | undefined) =>
    Number(value ?? 0).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  const getDepreciationSnapshot = ({
    purchaseCost,
    purchaseDate,
    purchaseYear,
    lifespanYears,
  }: {
    purchaseCost: number | null | undefined;
    purchaseDate: string | null | undefined;
    purchaseYear?: number | null | undefined;
    lifespanYears: number | null | undefined;
  }) => {
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
        ageYears: 0,
        lifespanYears: safeLifespanYears,
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
      ageYears: safeAgeYears,
      lifespanYears: safeLifespanYears,
    };
  };

  const getEquipmentDepreciationSummary = (item: EquipmentRow) => {
    const snapshot = getDepreciationSnapshot({
      purchaseCost: item.purchase_cost,
      purchaseDate: item.purchase_date,
      purchaseYear: item.purchase_year,
      lifespanYears: item.lifespan_years,
    });

    if (!snapshot) {
      return "Depreciation: purchase cost not set";
    }

    return `Depreciation: ${formatCurrencyAmount(snapshot.annualDepreciation)}/year / Book value: ${formatCurrencyAmount(snapshot.bookValue)}`;
  };

  const getEquipmentDepreciationDetail = (item: EquipmentRow) => {
    const snapshot = getDepreciationSnapshot({
      purchaseCost: item.purchase_cost,
      purchaseDate: item.purchase_date,
      purchaseYear: item.purchase_year,
      lifespanYears: item.lifespan_years,
    });

    if (!snapshot) {
      return "Accumulated depreciation: unavailable";
    }

    return `Accumulated: ${formatCurrencyAmount(snapshot.accumulatedDepreciation)} / Age: ${snapshot.ageYears} year(s) of ${snapshot.lifespanYears}`;
  };

  const getAssignmentDepreciationSummary = (assignment: AssignmentRow) =>
    getEquipmentDepreciationSummary(buildEquipmentRowFromAssignment(assignment));

  const getAssignmentDepreciationDetail = (assignment: AssignmentRow) =>
    getEquipmentDepreciationDetail(buildEquipmentRowFromAssignment(assignment));

  const normalizeRiskText = (value: string | null | undefined) => String(value || "").trim().toLowerCase();

  const getRiskDaysBetween = (startAt: string | null | undefined, endAt: string | null | undefined) => {
    if (!startAt) {
      return 0;
    }

    const start = new Date(startAt);
    const end = endAt ? new Date(endAt) : new Date();
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      return 0;
    }

    const diff = end.getTime() - start.getTime();
    return diff > 0 ? Math.ceil(diff / (1000 * 60 * 60 * 24)) : 0;
  };

  const getObservedReplacementOutcome = (item: EquipmentRow) => {
    if (item.status === "retired" || item.replacement_disposition === "retired") {
      return "Retired";
    }

    if (item.status === "replaced" || item.replacement_request_id || item.replacement_processed_at) {
      return "Replaced";
    }

    const itemMaintenanceRecords = maintenanceRecords.filter((record) => record.equipment_id === item.id);
    if (itemMaintenanceRecords.some((record) => record.maintenance_status === "repaired")) {
      return "Repaired and kept";
    }

    return "No final decision yet";
  };

  const getEquipmentReplacementRisk = (item: EquipmentRow): ReplacementRiskInsight => {
    const reasons: string[] = [];
    let score = 0;
    const snapshot = getDepreciationSnapshot({
      purchaseCost: item.purchase_cost,
      purchaseDate: item.purchase_date,
      purchaseYear: item.purchase_year,
      lifespanYears: item.lifespan_years,
    });
    const itemMaintenanceRecords = maintenanceRecords.filter((record) => record.equipment_id === item.id);
    const openIssueCount = issues.filter(
      (issue) => issue.equipment_id === item.id && !["closed", "resolved"].includes(normalizeRiskText(issue.issue_status)),
    ).length;
    const latestReturn = returns
      .filter((record) => record.equipment_id === item.id)
      .sort(
        (left, right) =>
          new Date(right.processed_at || right.returned_at || right.it_reviewed_at || right.requested_at).getTime() -
          new Date(left.processed_at || left.returned_at || left.it_reviewed_at || left.requested_at).getTime(),
      )[0];
    const downtimeDays = itemMaintenanceRecords.reduce(
      (total, record) => total + getRiskDaysBetween(record.started_at, record.completed_at),
      0,
    );
    const normalizedHealth = normalizeRiskText(item.device_health);
    const normalizedCondition = normalizeRiskText(latestReturn?.condition_status);
    const normalizedDisposition = normalizeRiskText(latestReturn?.disposition || item.replacement_disposition);

    if (snapshot) {
      const ageRatio = snapshot.lifespanYears > 0 ? snapshot.ageYears / snapshot.lifespanYears : 0;
      if (snapshot.ageYears >= snapshot.lifespanYears) {
        score += 28;
        reasons.push(`Reached lifespan limit (${snapshot.ageYears}/${snapshot.lifespanYears} years)`);
      } else if (ageRatio >= 0.75) {
        score += 18;
        reasons.push(`Near replacement window (${snapshot.ageYears}/${snapshot.lifespanYears} years used)`);
      } else if (ageRatio >= 0.5) {
        score += 8;
      }

      if ((item.purchase_cost ?? 0) > 0 && snapshot.bookValue <= (item.purchase_cost ?? 0) * 0.2 && snapshot.ageYears >= 2) {
        score += 10;
        reasons.push(`Low remaining book value (${formatCurrencyAmount(snapshot.bookValue)})`);
      }
    }

    if (item.warranty_end_date) {
      const warrantyEnd = new Date(item.warranty_end_date);
      if (!Number.isNaN(warrantyEnd.getTime())) {
        const daysToWarrantyEnd = Math.ceil((warrantyEnd.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        if (daysToWarrantyEnd < 0) {
          score += 15;
          reasons.push("Out of warranty");
        } else if (daysToWarrantyEnd <= 90) {
          score += 8;
          reasons.push(`Warranty ends in ${daysToWarrantyEnd} day(s)`);
        }
      }
    }

    if (itemMaintenanceRecords.length >= 4) {
      score += 24;
      reasons.push(`${itemMaintenanceRecords.length} maintenance events`);
    } else if (itemMaintenanceRecords.length >= 2) {
      score += 14;
      reasons.push(`${itemMaintenanceRecords.length} maintenance events`);
    } else if (itemMaintenanceRecords.length === 1) {
      score += 6;
    }

    if (openIssueCount >= 3) {
      score += 18;
      reasons.push(`${openIssueCount} unresolved issues`);
    } else if (openIssueCount >= 1) {
      score += 8;
      reasons.push(`${openIssueCount} unresolved issue${openIssueCount > 1 ? "s" : ""}`);
    }

    if (downtimeDays >= 30) {
      score += 18;
      reasons.push(`${downtimeDays} downtime day(s)`);
    } else if (downtimeDays >= 14) {
      score += 10;
      reasons.push(`${downtimeDays} downtime day(s)`);
    } else if (downtimeDays > 0) {
      score += 4;
    }

    if (["faulty", "poor", "damaged", "bad", "critical", "broken"].some((keyword) => normalizedHealth.includes(keyword))) {
      score += 20;
      reasons.push(`Device health marked as ${item.device_health}`);
    } else if (["fair", "warning", "aging"].some((keyword) => normalizedHealth.includes(keyword))) {
      score += 10;
      reasons.push(`Device health marked as ${item.device_health}`);
    }

    if (["damaged", "broken", "faulty", "poor", "not compatible"].some((keyword) => normalizedCondition.includes(keyword))) {
      score += 16;
      reasons.push(`Latest return condition: ${latestReturn?.condition_status}`);
    } else if (normalizedCondition) {
      score += 6;
    }

    if (["retired", "dispose", "disposed", "scrap", "not repairable"].some((keyword) => normalizedDisposition.includes(keyword))) {
      score += 25;
      reasons.push(`Latest disposition: ${latestReturn?.disposition || item.replacement_disposition}`);
    } else if (normalizedDisposition.includes("maintenance")) {
      score += 8;
    }

    if (item.replacement_request_id || item.replacement_processed_at || item.status === "replaced") {
      score += 12;
      reasons.push("Previously part of a replacement workflow");
    }

    if (["network", "server", "storage"].some((keyword) => normalizeRiskText(item.category_name).includes(keyword))) {
      score += 6;
    }

    const finalScore = Math.max(0, Math.min(Math.round(score), 100));
    let recommendation = "Keep in service";
    if (finalScore >= 75) {
      recommendation = "Replace recommended";
    } else if (finalScore >= 50) {
      recommendation = "Review for replacement";
    }

    if (reasons.length === 0) {
      reasons.push("No major replacement signals detected yet");
    }

    return {
      score: finalScore,
      recommendation,
      reasons,
      observedOutcome: getObservedReplacementOutcome(item),
    };
  };

  const formatQrStatusLabel = (status: EquipmentRow["status"]) => {
    if (status === "replaced") {
      return "Replaced";
    }

    if (status === "assigned") {
      return "Assigned";
    }

    if (status === "retired") {
      return "Disposed";
    }

    return status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, " ");
  };

  const buildEquipmentQrPayload = (item: EquipmentRow, audience: "employee" | "internal") =>
    audience === "employee"
      ? [
          "AIRTEL DEVICE PASS",
          `${item.equipment_name}`,
          `Tag: ${item.asset_tag}`,
          `Serial: ${item.serial_number}`,
          `Model: ${item.model_name || "Not set"}`,
          `PC Name: ${item.computer_name || "Not set"}`,
          `Status: ${formatQrStatusLabel(item.status)}`,
          `Specs: ${formatEquipmentSpecs(item) || "Not set"}`,
          `Accessories: ${formatEquipmentAccessories(item) || "Not set"}`,
          `Accessory Notes: ${formatEquipmentAccessoryNotes(item) || "None"}`,
          `Warranty: ${formatQrDate(item.warranty_end_date)}`,
          `${getEquipmentDepreciationSummary(item)}`,
          "Support: Share the asset tag with IT Support.",
        ].join("\n")
      : [
          "AIRTEL EQUIPMENT RECORD",
          `${item.equipment_name}`,
          `Tag: ${item.asset_tag}`,
          `ID: ${item.id}`,
          `Serial: ${item.serial_number}`,
          `PC Name: ${item.computer_name || "Not set"}`,
          `Category: ${item.category_name || "Not set"}`,
          `Vendor: ${item.vendor_name || "Not set"}`,
          `Model: ${item.model_name || "Not set"}`,
          `Status: ${formatQrStatusLabel(item.status)}`,
          `Accessories: ${formatEquipmentAccessories(item) || "Not set"}`,
          `Accessory Notes: ${formatEquipmentAccessoryNotes(item) || "None"}`,
          `Branch: ${item.branch_name || "No branch"}`,
          `Country: ${item.country_name || "No country"}`,
          `Location: ${item.location_details || "Not set"}`,
          `Health: ${item.device_health || "Not set"}`,
          `Purchased: ${formatQrDate(item.purchase_date)}`,
          `Cost: ${Number(item.purchase_cost ?? 0).toLocaleString()}`,
          `Warranty: ${formatQrDate(item.warranty_end_date)}`,
          `Lifespan: ${item.lifespan_years ?? 4} years`,
          `${getEquipmentDepreciationSummary(item)}`,
          `${getEquipmentDepreciationDetail(item)}`,
          `Replace By: ${getReplacementDate(item.purchase_date, item.lifespan_years, item.purchase_year)}`,
        ].join("\n");

  const handlePreviewEquipmentQr = async (item: EquipmentRow, targetSection: string = activeSection) => {
    const dataUrl = await loadEquipmentQrPreview(item);
    if (!dataUrl) {
      return;
    }

    setActiveSection(targetSection);
    window.location.hash = "equipment-qr-panel";
  };

  const handleDownloadEquipmentQr = () => {
    if (!selectedQrEquipment || !equipmentQrImageUrl) {
      return;
    }

    const link = document.createElement("a");
    link.href = equipmentQrImageUrl;
    link.download = `${selectedQrEquipment.asset_tag.toLowerCase()}-equipment-qr.png`;
    link.click();
  };

  const getReplacementStockLabel = (item: EquipmentRow) => {
    if (!item.replacement_request_id) {
      return null;
    }

    if (item.replacement_disposition === "available") {
      return "Replacement return: back in stock";
    }

    if (item.replacement_disposition === "retired") {
      return "Replacement return: disposed";
    }

    return "Replacement return recorded";
  };

  const getAssignmentReceiptLabel = (assignment: AssignmentRow) => {
    if (assignment.status === "returned" && isReplacementAssignment(assignment)) {
      return "replaced";
    }

    return assignment.receipt_status;
  };

  const getAssignmentStatusLabel = (assignment: AssignmentRow) => {
    if (assignment.status === "returned" && isReplacementAssignment(assignment)) {
      return "replaced";
    }

    return assignment.status;
  };

  const getReplacementAssignmentLabel = (assignment: AssignmentRow) => {
    if (!isReplacementAssignment(assignment)) {
      return null;
    }

    if (assignment.replacement_disposition === "retired") {
      return "Replacement outcome: disposed";
    }

    if (assignment.replacement_disposition === "available") {
      return "Replacement outcome: returned to stock";
    }

    return "Replacement recorded";
  };

  const handleCreateRequest = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const method = editingRequestId ? "PUT" : "POST";
    const url = editingRequestId ? `/requests/${editingRequestId}` : "/requests";

    await submitAction(
      method,
      url,
      {
        requesterId: user.id,
        categoryId: Number(
          requestForm.requestType === "replacement" || requestForm.requestType === "loss_theft"
            ? employeeActiveAssignmentOptions.find((item) => item.assignment.equipment_id === Number(requestForm.sourceEquipmentId))?.equipment.category_id || requestForm.categoryId
            : requestForm.categoryId,
        ),
        requestType: requestForm.requestType,
        targetEmployeeUserId: requestForm.targetEmployeeUserId ? Number(requestForm.targetEmployeeUserId) : null,
        expectedDeviceSpecs: requestForm.requestType === "loss_theft" ? null : requestForm.expectedDeviceSpecs || null,
        notes:
          requestForm.requestType === "loss_theft"
            ? [
                requestForm.reportType === "theft" ? "Incident type: theft" : "Incident type: loss",
                requestForm.incidentScope === "during_work" ? "Incident scope: during work" : "Incident scope: outside work (T&C apply)",
                requestForm.notes,
              ]
                .filter(Boolean)
                .join(" | ")
            : requestForm.notes,
        requestDate: requestForm.requestDate,
        sourceEquipmentId: requestForm.sourceEquipmentId ? Number(requestForm.sourceEquipmentId) : null,
        reportType: requestForm.requestType === "loss_theft" ? requestForm.reportType : null,
      },
      editingRequestId ? "Request updated." : "Equipment request submitted.",
    );

    setRequestForm({
      categoryId: "",
      requestType: roleView === "hr" ? "new_hire" : "standard",
      targetEmployeeUserId: "",
      expectedDeviceSpecs: "",
      notes: "",
      requestDate: todayDateValue,
      sourceEquipmentId: "",
      reportType: "loss",
      incidentScope: "during_work",
    });
    setEditingRequestId(null);
    setActiveSection("my-requests");
  };

  const handleEditRequest = (request: RequestRow) => {
    setEditingRequestId(request.id);
    setRequestForm({
      categoryId: String(request.category_id),
      requestType: request.request_type || "standard",
      targetEmployeeUserId: request.target_employee_user_id ? String(request.target_employee_user_id) : "",
      expectedDeviceSpecs: parseHrmsSnapshot(request.hrms_snapshot).expectedDeviceSpecs || "",
      notes: request.notes || "",
      requestDate: request.requested_at ? request.requested_at.slice(0, 10) : request.created_at.slice(0, 10),
      sourceEquipmentId: request.source_equipment_id ? String(request.source_equipment_id) : "",
      reportType: request.report_type || "loss",
      incidentScope: request.notes?.toLowerCase().includes("outside work") ? "outside_work" : "during_work",
    });
    setActiveSection("new-request");
  };

  const resetEmployeeForm = () => {
    setEditingEmployeeId(null);
    setIsEmployeeModalOpen(false);
    setEmployeeForm({
      firstName: "",
      lastName: "",
      email: "",
      phoneNumber: "",
      employeeCode: "",
      hrmsEmployeeId: "",
      employeeGrade: "",
      jobTitle: "",
      employmentStatus: "active",
      officeLocation: "",
      startDate: todayDateValue,
      status: "active",
    });
  };

  const handleSubmitEmployee = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const method = editingEmployeeId ? "PUT" : "POST";
    const url = editingEmployeeId ? `/hr/employees/${editingEmployeeId}` : "/hr/employees";

    await submitAction(
      method,
      url,
      {
        actorUserId: user.id,
        firstName: employeeForm.firstName,
        lastName: employeeForm.lastName,
        email: employeeForm.email,
        phoneNumber: employeeForm.phoneNumber || null,
        employeeCode: employeeForm.employeeCode || null,
        hrmsEmployeeId: employeeForm.hrmsEmployeeId || null,
        employeeGrade: employeeForm.employeeGrade || null,
        jobTitle: employeeForm.jobTitle || null,
        employmentStatus: employeeForm.employmentStatus || null,
        officeLocation: employeeForm.officeLocation || null,
        startDate: employeeForm.startDate || null,
        status: employeeForm.status,
        countryId: user.countryId,
        branchId: user.branchId,
        departmentId: user.departmentId,
      },
      editingEmployeeId ? "Employee updated." : "Employee created.",
    );

    resetEmployeeForm();
  };

  const handleEditEmployee = (employee: EmployeeRow) => {
    setEditingEmployeeId(employee.id);
    setIsEmployeeModalOpen(true);
    setEmployeeForm({
      firstName: employee.first_name || employee.full_name.split(" ")[0] || "",
      lastName: employee.last_name || employee.full_name.split(" ").slice(1).join(" ") || "",
      email: employee.email,
      phoneNumber: employee.phone_number || "",
      employeeCode: employee.employee_code || "",
      hrmsEmployeeId: employee.hrms_employee_id || "",
      employeeGrade: employee.employee_grade || "",
      jobTitle: employee.job_title || "",
      employmentStatus: employee.employment_status || "active",
      officeLocation: employee.office_location || "",
      startDate: employee.start_date ? employee.start_date.slice(0, 10) : todayDateValue,
      status: (employee.status as EmployeeFormState["status"]) || "active",
    });
    setActiveSection("employees");
  };

  const openEmployeeModal = () => {
    setEditingEmployeeId(null);
    setEmployeeForm({
      firstName: "",
      lastName: "",
      email: "",
      phoneNumber: "",
      employeeCode: "",
      hrmsEmployeeId: "",
      employeeGrade: "",
      jobTitle: "",
      employmentStatus: "active",
      officeLocation: "",
      startDate: todayDateValue,
      status: "active",
    });
    setIsEmployeeModalOpen(true);
  };

  const handleDeleteRequest = async (requestId: number) => {
    await submitAction(
      "DELETE",
      `/requests/${requestId}?requesterId=${user.id}`,
      undefined,
      "Request deleted.",
    );
  };

  const handleApproveRequest = async (requestId: number) => {
    const request = requests.find((item) => item.id === requestId);
    const selectedEquipmentId = fulfillmentForm[requestId]?.equipmentId || (request?.booked_equipment_id ? String(request.booked_equipment_id) : "");

    if (
      roleView === "it-support" &&
      request?.currentStageKey === "it_inventory_review" &&
      getEquipmentOptionsForRequest(request).length > 0 &&
      !selectedEquipmentId
    ) {
      setActionError("Select available equipment during IT Support approval.");
      return;
    }

    setPendingRequestActionId(requestId);
    try {
      await submitAction(
        "POST",
        `/requests/${requestId}/approve`,
        {
          actorUserId: user.id,
          note: approvalNotes[requestId] || null,
          equipmentId: selectedEquipmentId ? Number(selectedEquipmentId) : null,
        },
        "Workflow step approved.",
        {
          refreshDashboard: false,
          onSuccess: (data) => {
            if (data?.request) {
              patchRequestInDashboard(data.request as RequestRow);
            }
          },
        },
      );
    } finally {
      setPendingRequestActionId(null);
    }
  };

  const handleRejectRequest = async (requestId: number) => {
    const rejectionReason = (approvalNotes[requestId] || "").trim();

    if (!rejectionReason) {
      setActionError("Please enter a rejection reason before rejecting this request.");
      return;
    }

    setPendingRequestActionId(requestId);
    try {
      await submitAction(
        "POST",
        `/requests/${requestId}/reject`,
        {
          actorUserId: user.id,
          note: rejectionReason,
        },
        "Request rejected.",
        {
          refreshDashboard: false,
          onSuccess: (data) => {
            if (data?.request) {
              patchRequestInDashboard(data.request as RequestRow);
            }
          },
        },
      );
    } finally {
      setPendingRequestActionId(null);
    }
  };

  const handleReturnRequestForClarification = async (requestId: number) => {
    const clarificationNote = (approvalNotes[requestId] || "").trim();

    if (!clarificationNote) {
      setActionError("Please explain what information is missing before returning this request.");
      return;
    }

    setPendingRequestActionId(requestId);
    try {
      await submitAction(
        "POST",
        `/requests/${requestId}/return`,
        {
          actorUserId: user.id,
          note: clarificationNote,
        },
        "Request returned for clarification.",
        {
          refreshDashboard: false,
          onSuccess: (data) => {
            if (data?.request) {
              patchRequestInDashboard(data.request as RequestRow);
            }
          },
        },
      );
    } finally {
      setPendingRequestActionId(null);
    }
  };

  const handleFulfillRequest = async (requestId: number) => {
    const request = requests.find((item) => item.id === requestId);
    const form = fulfillmentForm[requestId];
    const finalEquipmentId = request?.booked_equipment_id ? String(request.booked_equipment_id) : form?.equipmentId || "";

    if (!finalEquipmentId) {
      setActionError("Reserve equipment before fulfilling the request.");
      return;
    }

    await submitAction(
      "POST",
      `/requests/${requestId}/fulfill`,
      {
        actorUserId: user.id,
        equipmentId: Number(finalEquipmentId),
        expectedReturnDate: form?.expectedReturnDate || null,
        note: form?.note || null,
        replacementDisposition: request?.request_type === "replacement" ? form?.replacementDisposition || "available" : null,
        replacementConditionStatus: request?.request_type === "replacement" ? form?.replacementConditionStatus || null : null,
      },
      "Request fulfilled and equipment assigned.",
    );
  };

  const handleUpdateFulfillmentStatus = async (requestId: number) => {
    const form = fulfillmentForm[requestId];
    const fulfillmentStatus = form?.fulfillmentStatus || "waiting_stock";

    await submitAction(
      "POST",
      `/requests/${requestId}/fulfillment-status`,
      {
        actorUserId: user.id,
        fulfillmentStatus,
        note: form?.note || null,
      },
      "Fulfillment status updated.",
    );
  };

  const handleSubmitIssue = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const method = editingIssueId ? "PUT" : "POST";
    const url = editingIssueId ? `/issues/${editingIssueId}` : "/issues";

    await submitAction(
      method,
      url,
      editingIssueId
        ? {
            issueTitle: issueForm.issueTitle,
            issueDescription: issueForm.issueDescription,
            priority: issueForm.priority,
            issueStatus: issueForm.issueStatus,
          }
        : {
            equipmentId: Number(issueForm.equipmentId),
            reportedBy: user.id,
            issueTitle: issueForm.issueTitle,
            issueDescription: issueForm.issueDescription,
            priority: issueForm.priority,
          },
      editingIssueId ? "Issue updated." : "Issue created.",
    );

    setIssueForm({
      equipmentId: "",
      issueTitle: "",
      issueDescription: "",
      priority: "medium",
      issueStatus: "open",
    });
    setEditingIssueId(null);
  };

  const handleEditIssue = (issue: IssueRow) => {
    setEditingIssueId(issue.id);
    setIssueForm({
      equipmentId: String(issue.equipment_id),
      issueTitle: issue.issue_title,
      issueDescription: issue.issue_description || "",
      priority: issue.priority,
      issueStatus: issue.issue_status,
    });
    setActiveSection("equipment");
  };

  const handleDeleteIssue = async (issueId: number) => {
    await submitAction("DELETE", `/issues/${issueId}`, undefined, "Issue deleted.");
  };

  const resetStockForm = () => {
    setEditingEquipmentId(null);
    setIsStockFormOpen(false);
    setStockForm({
      assetTag: "",
      serialNumber: "",
      computerName: "",
      equipmentName: "",
      categoryId: "",
      vendorName: "",
      modelName: "",
      cpu: "",
      status: "available",
      ram: "",
      storageCapacity: "",
      storageType: "SSD",
      osVersion: "",
      purchaseYear: "",
      purchaseCost: "",
      purchaseDate: "",
      locationDetails: "",
      deviceHealth: "Healthy",
      warrantyEndDate: "",
      lifespanYears: "4",
      includedAccessories: [],
      accessoryNotes: "",
    });
  };

  const handleSubmitEquipment = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (
      hasRequiredAccessoryChecklist &&
      requiredStockAccessories.some((accessory) => !stockForm.includedAccessories.includes(accessory))
    ) {
      setActionError(`Confirm all required ${selectedStockCategory?.name || "device"} accessories before saving the asset.`);
      return;
    }

    const method = editingEquipmentId ? "PUT" : "POST";
    const url = editingEquipmentId ? `/equipment/${editingEquipmentId}` : "/equipment";

    const result = await submitAction(
      method,
      url,
      {
        assetTag: stockForm.assetTag,
        serialNumber: stockForm.serialNumber,
        computerName: stockForm.computerName,
        equipmentName: resolvedEquipmentName,
        categoryId: Number(stockForm.categoryId),
        countryId: user.countryId,
        branchId: user.branchId,
        vendorName: stockForm.vendorName,
        modelName: stockForm.modelName,
        status: stockForm.status,
        purchaseYear: Number(stockForm.purchaseYear || 0) || null,
        purchaseCost: Number(stockForm.purchaseCost || 0),
        purchaseDate: stockForm.purchaseDate || null,
        locationDetails: stockForm.locationDetails || null,
        deviceHealth: stockForm.deviceHealth || null,
        warrantyEndDate: stockForm.warrantyEndDate || null,
        lifespanYears: Number(stockForm.lifespanYears || 4),
        equipmentSpecs: isStorageDeviceStockForm
          ? {
              cpu: stockForm.cpu,
              ram: stockForm.ram,
              storageCapacity: stockForm.storageCapacity,
              storageType: stockForm.storageType,
              osVersion: stockForm.osVersion,
              accessories: stockForm.includedAccessories,
              accessoryNotes: stockForm.accessoryNotes || null,
            }
          : {
              accessories: stockForm.includedAccessories,
              accessoryNotes: stockForm.accessoryNotes || null,
            },
      },
      editingEquipmentId ? "Stock item updated." : "Stock item created.",
    );

    const equipmentRecord = result?.equipment as EquipmentRow | undefined;

    resetStockForm();
    if (equipmentRecord) {
      await handlePreviewEquipmentQr(equipmentRecord);
    }
  };

  const handleEditEquipment = (item: EquipmentRow) => {
    const specs = parseEquipmentSpecs(item.equipment_specs);

    setEditingEquipmentId(item.id);
    setIsStockFormOpen(true);
    setStockForm({
      assetTag: item.asset_tag,
      serialNumber: item.serial_number,
      computerName: item.computer_name || "",
      equipmentName: item.equipment_name,
      categoryId: String(item.category_id),
      vendorName: item.vendor_name || "",
      modelName: item.model_name || "",
      cpu: specs.cpu || specs.processor || "",
      status: item.status,
      ram: specs.ram || "",
      storageCapacity: specs.storageCapacity || specs.storage || "",
      storageType: specs.storageType || "SSD",
      osVersion: specs.osVersion || specs.operatingSystem || "",
      purchaseYear: item.purchase_year ? String(item.purchase_year) : "",
      purchaseCost: item.purchase_cost ? String(item.purchase_cost) : "",
      purchaseDate: item.purchase_date ? item.purchase_date.slice(0, 10) : "",
      locationDetails: item.location_details || "",
      deviceHealth: item.device_health || "Healthy",
      warrantyEndDate: item.warranty_end_date ? item.warranty_end_date.slice(0, 10) : "",
      lifespanYears: String(item.lifespan_years ?? 4),
      includedAccessories: Array.isArray(specs.accessories) ? specs.accessories : [],
      accessoryNotes: specs.accessoryNotes || "",
    });
    setActiveSection("stock");
  };

  const handleDeleteEquipment = async (equipmentId: number) => {
    await submitAction("DELETE", `/equipment/${equipmentId}`, undefined, "Stock item deleted.");
  };

  const handleCreateStockCategory = async () => {
    const categoryName = newStockCategoryName.trim();

    if (!categoryName) {
      setActionError("Enter the new category name first.");
      return;
    }

    const result = await submitAction(
      "POST",
      "/categories",
      {
        name: categoryName,
        depreciationRate: 20,
      },
      "Category ready for stock registration.",
    );

    const createdCategory = result?.category as CategoryRow | undefined;

    if (createdCategory?.id) {
      setStockForm((current) => ({
        ...current,
        categoryId: String(createdCategory.id),
        equipmentName: createdCategory.name,
      }));
      setNewStockCategoryName("");
    }
  };

  const handleRequestReturn = async (assignmentId: number) => {
    await submitAction(
      "POST",
      "/returns/request",
      {
        assignmentId,
        employeeUserId: user.id,
        note: returnRequestNotes[assignmentId] || null,
        returnReason: returnRequestReasons[assignmentId] || "standard",
      },
      "Return request submitted.",
    );

    setReturnRequestNotes((current) => ({
      ...current,
      [assignmentId]: "",
    }));
    setReturnRequestReasons((current) => ({
      ...current,
      [assignmentId]: "standard",
    }));
  };

  const handleItReturnReview = async (returnId: number) => {
    const form = itReturnReviewForm[returnId] ?? {
      conditionStatus: "good",
      disposition: "available",
      reviewNote: "",
      action: "forward" as const,
    };

    await submitAction(
      "POST",
      `/returns/${returnId}/it-review`,
      {
        actorUserId: user.id,
        conditionStatus: form.conditionStatus,
        disposition: form.disposition,
        reviewNote: form.reviewNote || null,
        action: form.action,
      },
      form.action === "reject"
        ? "Return rejected by IT."
        : form.action === "return_to_employee"
          ? "Equipment sent back to employee."
          : "Return sent to IT Support Engineer for intake.",
    );

    setItReturnReviewForm((current) => ({
      ...current,
      [returnId]: {
        conditionStatus: "good",
        disposition: "available",
        reviewNote: "",
        action: "forward",
      },
    }));
  };

  const handleConfirmReceipt = async (assignmentId: number) => {
    await submitAction(
      "POST",
      `/assignments/${assignmentId}/confirm-receipt`,
      {
        employeeUserId: user.id,
        note: receiptNotes[assignmentId] || null,
      },
      "Equipment receipt confirmed.",
    );

    setReceiptNotes((current) => ({
      ...current,
      [assignmentId]: "",
    }));
  };

  const handleProcessReturn = async (returnId: number) => {
    const form = returnProcessForm[returnId] ?? {
      conditionStatus: "good",
      disposition: "available",
      intakeNote: "",
      action: "complete" as const,
    };

    await submitAction(
      "POST",
      `/returns/${returnId}/process`,
      {
        actorUserId: user.id,
        conditionStatus: form.conditionStatus,
        disposition: form.disposition,
        intakeNote: form.intakeNote || null,
        action: form.action,
      },
      form.action === "reject" ? "Return request rejected." : "Return intake completed.",
    );

    setReturnProcessForm((current) => ({
      ...current,
      [returnId]: {
        conditionStatus: "good",
        disposition: "available",
        intakeNote: "",
        action: "complete",
      },
    }));
  };

  const handleFinalReturnApproval = async (returnId: number) => {
    const form = finalReturnApprovalForm[returnId] ?? {
      decision: "approve" as const,
      note: "",
    };

    await submitAction(
      "POST",
      `/returns/${returnId}/final-approve`,
      {
        actorUserId: user.id,
        decision: form.decision,
        note: form.note || null,
      },
      form.decision === "reject" ? "Final return approval rejected." : "Final return approval recorded.",
    );

    setFinalReturnApprovalForm((current) => ({
      ...current,
      [returnId]: {
        decision: "approve",
        note: "",
      },
    }));
  };

  const handleCompleteMaintenance = async (maintenanceId: number) => {
    const form = maintenanceCloseForm[maintenanceId] ?? {
      maintenanceStatus: "repaired" as const,
      finalDisposition: "available",
      resolutionNote: "",
    };

    await submitAction(
      "POST",
      `/maintenance/${maintenanceId}/complete`,
      {
        actorUserId: user.id,
        maintenanceStatus: form.maintenanceStatus,
        finalDisposition: form.finalDisposition,
        resolutionNote: form.resolutionNote || null,
      },
      "Maintenance completed and stock status recorded.",
    );

    setMaintenanceCloseForm((current) => ({
      ...current,
      [maintenanceId]: {
        maintenanceStatus: "repaired",
        finalDisposition: "available",
        resolutionNote: "",
      },
    }));
  };

  const getWorkflowSummary = (request: RequestRow) =>
    request.workflowSteps.map((step) => `${step.step_label}: ${step.action_status}`).join(" | ");

  const getEquipmentOptionsForRequest = (request: RequestRow) =>
    localAvailableEquipment.filter(
      (item) =>
        item.category_id === request.category_id &&
        (!request.requester_branch_id || item.branch_id === request.requester_branch_id) &&
        !requests.some(
          (otherRequest) =>
            otherRequest.id !== request.id &&
            otherRequest.booked_equipment_id === item.id &&
            !["fulfilled", "rejected"].includes(otherRequest.request_status),
        ),
    );

  const employeeStatusCounts = useMemo(
    () =>
      ["pending", "approved", "rejected", "fulfilled"].map((status) => ({
        label: status,
        total: employeeRequests.filter((request) =>
          status === "pending" ? isLivePendingRequest(request) : request.request_status === status,
        ).length,
      })),
    [employeeRequests],
  );

  const toastState = useMemo(() => {
    if (actionError) {
      return { message: actionError, type: "error" as const };
    }

    if (dashboardError) {
      return { message: dashboardError, type: "error" as const };
    }

    if (equipmentQrError) {
      return { message: equipmentQrError, type: "error" as const };
    }

    if (actionMessage) {
      return { message: actionMessage, type: "success" as const };
    }

    return null;
  }, [actionError, actionMessage, dashboardError, equipmentQrError]);

  useEffect(() => {
    if (!toastState) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setActionMessage("");
      setActionError("");
      setDashboardError("");
      setEquipmentQrError("");
    }, 3200);

    return () => window.clearTimeout(timeout);
  }, [toastState]);

  const canRequesterUpdateRequest = (request: RequestRow) => {
    if (request.requester_id !== user.id) {
      return false;
    }

    if (request.clarification_status === "needed") {
      return true;
    }

    if (roleView !== "employee") {
      return false;
    }

    if (request.request_status !== "pending") {
      return false;
    }

    const firstStep = request.workflowSteps[0];
    return firstStep?.action_status === "pending";
  };

  const exportBrandedDocument = (
    filename: string,
    title: string,
    subtitle: string,
    rows: Record<string, string | number | null | undefined>[],
  ) => {
    if (rows.length === 0) {
      setActionError("There is no data to export for this report.");
      return;
    }

    const headers = Object.keys(rows[0]);
    const headerLabels = headers.map((header) => header.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase()));
    const generatedOn = new Date().toLocaleString();
    const logoUrl = `${window.location.origin}/airtel-logo.png`;
    const escapeHtml = (value: string | number | null | undefined) =>
      String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");

    const tableHead = headerLabels.map((label) => `<th>${escapeHtml(label)}</th>`).join("");
    const tableBody = rows
      .map(
        (row) =>
          `<tr>${headers
            .map((header) => `<td>${escapeHtml(row[header]) || "&nbsp;"}</td>`)
            .join("")}</tr>`,
      )
      .join("");

    const documentHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(title)}</title>
  <style>
    body { font-family: "Segoe UI", Arial, sans-serif; margin: 0; background: #f4f7fb; color: #17324d; }
    .page { max-width: 1200px; margin: 0 auto; padding: 32px; }
    .sheet { background: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 18px 45px rgba(23, 50, 77, 0.12); }
    .hero { padding: 28px 32px; background: linear-gradient(135deg, #ffffff 0%, #eef6fb 100%); border-bottom: 4px solid #d71920; display: flex; justify-content: space-between; gap: 20px; align-items: center; }
    .hero img { height: 46px; width: auto; display: block; }
    .eyebrow { margin: 0 0 8px; font-size: 12px; font-weight: 800; letter-spacing: 0.16em; text-transform: uppercase; color: #d71920; }
    h1 { margin: 0; font-size: 28px; line-height: 1.2; }
    .subtitle { margin: 10px 0 0; font-size: 14px; color: #587287; }
    .meta { text-align: right; font-size: 13px; color: #587287; }
    .meta strong { display: block; color: #17324d; font-size: 14px; margin-bottom: 6px; }
    .table-wrap { padding: 22px 32px 32px; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    th { text-align: left; background: #eef6fb; color: #17324d; font-size: 12px; letter-spacing: 0.08em; text-transform: uppercase; padding: 14px 12px; border-bottom: 1px solid rgba(29, 111, 165, 0.16); }
    td { padding: 14px 12px; border-bottom: 1px solid rgba(29, 111, 165, 0.12); vertical-align: top; color: #20384d; }
    tr:nth-child(even) td { background: rgba(238, 246, 251, 0.36); }
    .footer { padding: 0 32px 28px; color: #587287; font-size: 12px; }
  </style>
</head>
<body>
  <div class="page">
    <div class="sheet">
      <div class="hero">
        <div>
          <p class="eyebrow">Airtel Inventory Management System</p>
          <h1>${escapeHtml(title)}</h1>
          <p class="subtitle">${escapeHtml(subtitle)}</p>
        </div>
        <div class="meta">
          <img src="${logoUrl}" alt="Airtel logo" />
          <strong>Professional Export</strong>
          <span>Generated: ${escapeHtml(generatedOn)}</span>
          <span>Total records: ${rows.length}</span>
        </div>
      </div>
      <div class="table-wrap">
        <table>
          <thead><tr>${tableHead}</tr></thead>
          <tbody>${tableBody}</tbody>
        </table>
      </div>
      <div class="footer">Generated from Airtel IMS workflow dashboard.</div>
    </div>
  </div>
</body>
</html>`;

    const blob = new Blob([documentHtml], { type: "text/html;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleExportTimeline = () => {
    exportBrandedDocument(
      `${roleView}-request-timeline.html`,
      "Workflow Timeline Report",
      "A consolidated view of request progress, branches, approvers, and current workflow stages.",
      timelineRequests.map((request) => ({
        request_id: request.id,
        requester: request.requester_name,
        category: request.category_name,
        branch: request.branch_name,
        status: request.request_status,
        current_stage: request.currentStageLabel,
        approver: request.approver_name,
        created_at: request.created_at,
      })),
    );
  };

  const handleExportReports = () => {
    const reportRows =
      [
        ...reportRequestSource.map((request) => ({
          report_type: "request",
          record_id: request.id,
          status: request.request_status,
          current_stage: request.currentStageLabel,
          requester: request.requester_name,
          requester_email: request.requester_email,
          requester_job_title: request.requester_job_title,
          requester_employment_status: request.requester_employment_status,
          requester_office_location: request.requester_office_location,
          requester_start_date: request.requester_start_date,
          category: request.category_name,
          branch: request.branch_name,
          approver: request.approver_name,
          fulfillment_status: request.fulfillment_status || "",
          fulfillment_note: request.fulfillment_note || "",
          request_note: request.notes || "",
          workflow_summary: getWorkflowSummary(request),
          created_at: request.created_at,
        })),
        ...(roleView === "it-manager" || roleView === "it-support"
          ? getEquipmentForReportStatus("available")
              .concat(
                roleView === "it-manager"
                  ? [
                      ...getEquipmentForReportStatus("maintenance"),
                      ...getEquipmentForReportStatus("assigned"),
                      ...getEquipmentForReportStatus("retired"),
                      ...getEquipmentForReportStatus("lost"),
                    ]
                  : [
                      ...getEquipmentForReportStatus("assigned"),
                      ...getEquipmentForReportStatus("maintenance"),
                      ...getEquipmentForReportStatus("retired"),
                      ...getEquipmentForReportStatus("lost"),
                    ],
              )
              .filter((item, index, items) => items.findIndex((candidate) => candidate.id === item.id) === index)
              .map((item) => ({
                report_type: "equipment",
                record_id: item.id,
                status: item.status,
                current_stage: "",
                requester: "",
                requester_email: "",
                requester_job_title: "",
                requester_employment_status: "",
                requester_office_location: "",
                requester_start_date: "",
                category: item.category_name || "",
                branch: item.branch_name || "",
                approver: "",
                fulfillment_status: "",
                fulfillment_note: "",
                request_note: item.notes || "",
                workflow_summary: formatEquipmentSpecs(item) || "",
                created_at: item.purchase_date || "",
              }))
          : []),
        ...(roleView === "it-support"
          ? ["active", "returned"].flatMap((status) =>
              getAssignmentsForReportStatus(status).map((assignment) => ({
                report_type: "assignment",
                record_id: assignment.id,
                status: assignment.status,
                current_stage: "",
                requester: assignment.employee_name,
                requester_email: assignment.employee_email,
                requester_job_title: assignment.employee_job_title,
                requester_employment_status: "",
                requester_office_location: assignment.employee_office_location,
                requester_start_date: "",
                category: "",
                branch: assignment.branch_name || "",
                approver: assignment.assigned_by_name || "",
                fulfillment_status: "",
                fulfillment_note: "",
                request_note: assignment.notes || "",
                workflow_summary: `${assignment.asset_tag} / ${assignment.equipment_name}`,
                created_at: assignment.assigned_at,
              })),
            )
          : []),
      ];

    exportBrandedDocument(
      `${roleView}-reports.html`,
      "Workflow Report Export",
      "Airtel IMS request, asset, and assignment reporting snapshot.",
      reportRows,
    );
  };

  const reportRequestSource =
    roleView === "employee"
      ? employeeRequests
      : roleView === "branch-manager"
        ? branchRequests
        : requests;

  const getRequestsForReportStatus = (status: string) =>
    reportRequestSource.filter((request) => {
      if (status === "pending") {
        return isLivePendingRequest(request);
      }

      return request.request_status === status;
    });

  const getEquipmentForReportStatus = (status: string) =>
    equipment.filter((item) => {
      if (roleView === "it-support" && user.branchId && item.branch_id !== user.branchId) {
        return false;
      }

      return item.status === status;
    });

  const getAssignmentsForReportStatus = (status: string) =>
    assignments.filter((assignment) => {
      if (roleView === "it-support" && user.branchId) {
        const relatedEquipment = equipmentById.get(assignment.equipment_id);

        if (!relatedEquipment || relatedEquipment.branch_id !== user.branchId) {
          return false;
        }
      }

      return assignment.status === status;
    });

  const renderRequestCards = (
    requestRows: RequestRow[],
    mode: "view" | "approve" | "fulfill",
  ) => {
    const pageKey = `${activeSection}-${mode}`;
    const pageSize = pageSizeByKey[pageKey] || DEFAULT_ITEMS_PER_PAGE;
    const totalPages = Math.max(Math.ceil(requestRows.length / pageSize), 1);
    const currentPage = Math.min(requestPageByKey[pageKey] || 1, totalPages);
    const paginatedRows = paginateRows(requestRows, currentPage, pageSize);

    return (
      <div className="user-table workflow-request-table">
        <div className="user-table-head workflow-request-table-head">
          <span>Request</span>
          <span>Requester</span>
          <span>Employee / Context</span>
          <span>Workflow</span>
          <span>Notes</span>
          <span>Actions</span>
        </div>
        {requestRows.length > 0 ? (
          paginatedRows.map((request) => (
          <div className="user-table-row workflow-request-table-row" key={request.id}>
            {(() => {
              const hrmsSnapshot = parseHrmsSnapshot(request.hrms_snapshot);
              const employeeName = request.target_employee_name || hrmsSnapshot.employeeName;
              const employeeRole = request.target_employee_job_title || hrmsSnapshot.jobTitle || request.target_employee_role_name || hrmsSnapshot.roleName;
              const employeeHrmsId = request.target_employee_hrms_employee_id || hrmsSnapshot.hrmsEmployeeId;
              const employeeCode = request.target_employee_code || hrmsSnapshot.employeeCode;
              const employeeGrade = request.target_employee_grade || hrmsSnapshot.employeeGrade;
              const employeeLocation = request.target_employee_office_location || hrmsSnapshot.officeLocation;
              const employeeEmploymentStatus = request.target_employee_employment_status || hrmsSnapshot.employmentStatus;
              const employeeStartDate = request.target_employee_start_date || hrmsSnapshot.startDate;
              const expectedDeviceSpecs = hrmsSnapshot.expectedDeviceSpecs;

              return (
                <>
                  <div className="user-primary-cell">
                    <strong>{request.category_name}</strong>
                    <span>Request #{request.id}</span>
                    <span>Type: {(request.request_type || "standard").replace("_", " ")}</span>
                    <span>
                      <span className={`status-pill status-${request.request_status}`}>{request.request_status}</span>
                    </span>
                  </div>
                  <div className="user-secondary-cell">
                    <strong>{request.requester_name}</strong>
                    <span>{request.requester_department_name || request.requester_job_title || "No department"}</span>
                    <span>{request.requester_employment_status || "No employment status"}</span>
                    <span>{request.requester_office_location || "No office location"} / Requested: {formatProfileDate(request.requested_at || request.created_at)}</span>
                  </div>
                  <div className="workflow-table-stack">
                    <div className="user-secondary-cell">
                      <strong>{employeeName || "No target employee"}</strong>
                      <span>{request.target_employee_email || hrmsSnapshot.employeeEmail || "No email"}</span>
                      <span>{employeeRole || "No role captured"} / {request.target_employee_department_name || "No department captured"}</span>
                      <span>{employeeHrmsId || "No HRMS id"} / {employeeCode || "No employee code"} / {employeeGrade || "No employee grade"}</span>
                      <span>{employeeLocation || "No office location"} / {employeeEmploymentStatus || "No employment status"} / Start {formatProfileDate(employeeStartDate)}</span>
                      <span>{expectedDeviceSpecs || "No expected device specs were captured."}</span>
                    </div>
                  </div>
                  <div className="workflow-table-stack">
                    <div className="user-secondary-cell">
                      <strong>{request.branch_name || "No branch"}</strong>
                      <span>{normalizeWorkflowLabel(request.currentStageLabel)}</span>
                      {request.fulfillment_status && request.fulfillment_status !== "ready" ? (
                        <span>
                          Store status: <span className={`status-pill status-${request.fulfillment_status}`}>{request.fulfillment_status.replace("_", " ")}</span>
                          {request.fulfillment_note ? ` / ${request.fulfillment_note}` : ""}
                        </span>
                      ) : null}
                    </div>
                    {roleView === "employee" && mode === "view" ? (
                      (() => {
                        const nextPendingStep = request.workflowSteps.find((step) => step.action_status === "pending");

                        if (request.request_status === "fulfilled") {
                          return (
                            <div className="workflow-step-row workflow-step-inline">
                              <strong>Request complete</strong>
                              <span>Equipment has been delivered.</span>
                            </div>
                          );
                        }

                        if (request.request_status === "rejected") {
                          return (
                            <div className="workflow-step-row workflow-step-inline">
                              <strong>Request rejected</strong>
                              <span>
                                {normalizeWorkflowLabel(
                                  request.workflowSteps.find((step) => step.action_status === "rejected")?.step_label || "Approval workflow",
                                )}
                              </span>
                            </div>
                          );
                        }

                        if (nextPendingStep) {
                          return (
                            <div className="workflow-step-row workflow-step-inline">
                              <strong>Waiting for approval</strong>
                              <span>{nextPendingStep.actor_role} to approve.</span>
                            </div>
                          );
                        }

                        return (
                          <div className="workflow-step-row workflow-step-inline">
                            <strong>Approval complete</strong>
                            <span>Waiting for fulfillment and handover.</span>
                          </div>
                        );
                      })()
                    ) : (
                      <div className="workflow-step-list">
                        {request.workflowSteps.map((step) => (
                          <div className="workflow-step-row" key={step.id}>
                            <strong>{normalizeWorkflowLabel(step.step_label)}</strong>
                            <span>
                              {step.action_status}
                              {step.actor_name ? ` / ${step.actor_name}` : ""}
                            </span>
                            {step.action_note ? <span>{step.action_note}</span> : null}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="workflow-table-stack">
                    <div className="user-secondary-cell">
                      <strong>{request.notes || "No request note provided."}</strong>
                      {request.clarification_status === "needed" && request.clarification_note ? (
                        <span className="warning-text">Clarification needed: {request.clarification_note}</span>
                      ) : null}
                      {request.request_status === "rejected" ? (
                        <span className="error-text">
                          Rejection reason:{" "}
                          {request.workflowSteps.find((step) => step.action_status === "rejected")?.action_note ||
                            request.notes ||
                            "No rejection reason was recorded."}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </>
              );
            })()}

            <div className="workflow-table-actions">
            {mode === "view" ? (
                <div className="table-action-group workflow-stock-table-actions">
                  <button className="table-action" type="button" onClick={() => void openDetailPanel("request", request.id)}>
                    View details
                  </button>
                  {canRequesterUpdateRequest(request) ? (
                  <button className="table-action" type="button" onClick={() => handleEditRequest(request)}>
                    Update request
                  </button>
                  ) : null}
                  {roleView === "employee" && request.clarification_status !== "needed" && canRequesterUpdateRequest(request) ? (
                    <button className="table-action table-action-danger" type="button" onClick={() => void handleDeleteRequest(request.id)}>
                      Delete
                    </button>
                  ) : null}
                </div>
            ) : (
              <div className="card-form-stack">
                {mode === "approve" ? (
                  <>
                    {(() => {
                      const isSubmitting = pendingRequestActionId === request.id;
                      const showInventoryReservation = roleView === "it-support" && request.currentStageKey === "it_inventory_review";
                      const reservedEquipment = request.booked_equipment_id ? equipmentById.get(request.booked_equipment_id) : null;

                      return (
                        <>
                    {showInventoryReservation ? (
                      <>
                      <select
                        value={fulfillmentForm[request.id]?.equipmentId || (request.booked_equipment_id ? String(request.booked_equipment_id) : "")}
                        onChange={(event) =>
                          setFulfillmentForm((current) => ({
                            ...current,
                              [request.id]: {
                                equipmentId: event.target.value,
                                expectedReturnDate: current[request.id]?.expectedReturnDate || "",
                                note: current[request.id]?.note || "",
                                fulfillmentStatus: current[request.id]?.fulfillmentStatus || "ready",
                                replacementDisposition: current[request.id]?.replacementDisposition || "available",
                                replacementConditionStatus: current[request.id]?.replacementConditionStatus || "",
                              },
                            }))
                          }
                          disabled={isSubmitting}
                        >
                          <option value="">Select equipment to reserve</option>
                          {getEquipmentOptionsForRequest(request).map((item) => (
                            <option key={item.id} value={item.id}>
                              {item.asset_tag} / {item.equipment_name}
                            </option>
                          ))}
                        </select>
                        {reservedEquipment ? (
                          <div className="workflow-step-row workflow-step-inline">
                            <strong>Reserved item</strong>
                            <span>{reservedEquipment.asset_tag} / {reservedEquipment.equipment_name}</span>
                          </div>
                        ) : null}
                        {getEquipmentOptionsForRequest(request).length === 0 ? (
                          <p className="loading-text">No matching available stock right now. Approve the step and continue tracking fulfillment status until stock is available.</p>
                        ) : null}
                      </>
                    ) : null}
                    <textarea
                      value={approvalNotes[request.id] || ""}
                      onChange={(event) =>
                        setApprovalNotes((current) => ({
                          ...current,
                          [request.id]: event.target.value,
                        }))
                      }
                      placeholder="Approval note, or required reason if returning/rejecting"
                      disabled={isSubmitting}
                    />
                    <div className="card-action-row">
                      <button
                        className="primary-btn compact-btn btn-success"
                        type="button"
                        onClick={() => void handleApproveRequest(request.id)}
                        disabled={isSubmitting}
                      >
                        {isSubmitting ? "Working..." : "Approve"}
                      </button>
                      <button
                        className="secondary-btn compact-btn btn-soft-warning"
                        type="button"
                        onClick={() => void handleReturnRequestForClarification(request.id)}
                        disabled={isSubmitting}
                      >
                        {isSubmitting ? "Working..." : "Return"}
                      </button>
                      <button
                        className="secondary-btn compact-btn btn-soft-danger"
                        type="button"
                        onClick={() => void handleRejectRequest(request.id)}
                        disabled={isSubmitting}
                      >
                        {isSubmitting ? "Working..." : "Reject"}
                      </button>
                    </div>
                        </>
                      );
                    })()}
                  </>
                ) : (
                  <>
                    {request.booked_equipment_id ? (
                      (() => {
                        const reservedEquipment = equipmentById.get(request.booked_equipment_id);

                        return reservedEquipment ? (
                          <div className="workflow-step-list">
                            <div className="workflow-step-row">
                              <strong>Reserved equipment</strong>
                              <span>{reservedEquipment.asset_tag} / {reservedEquipment.equipment_name}</span>
                            </div>
                            {formatEquipmentSpecs(reservedEquipment) ? (
                              <div className="workflow-step-row">
                                <strong>Device specs</strong>
                                <span>{formatEquipmentSpecs(reservedEquipment)}</span>
                              </div>
                            ) : null}
                            <div className="card-action-row">
                              <button className="secondary-btn compact-btn" type="button" onClick={() => void handlePreviewEquipmentQr(reservedEquipment, activeSection)}>
                                QR code
                              </button>
                            </div>
                          </div>
                        ) : (
                          <p className="loading-text">Reserved equipment details are not available right now.</p>
                        );
                      })()
                    ) : (
                      <select
                        value={fulfillmentForm[request.id]?.equipmentId || ""}
                        onChange={(event) =>
                          setFulfillmentForm((current) => ({
                            ...current,
                            [request.id]: {
                              equipmentId: event.target.value,
                              expectedReturnDate: current[request.id]?.expectedReturnDate || "",
                              note: current[request.id]?.note || "",
                              fulfillmentStatus: current[request.id]?.fulfillmentStatus || "waiting_stock",
                              replacementDisposition: current[request.id]?.replacementDisposition || "available",
                              replacementConditionStatus: current[request.id]?.replacementConditionStatus || "",
                            },
                          }))
                        }
                      >
                        <option value="">Select equipment</option>
                        {getEquipmentOptionsForRequest(request).map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.asset_tag} / {item.equipment_name}
                          </option>
                        ))}
                      </select>
                    )}
                    <input
                      type="date"
                      value={fulfillmentForm[request.id]?.expectedReturnDate || ""}
                      onChange={(event) =>
                        setFulfillmentForm((current) => ({
                          ...current,
                          [request.id]: {
                            equipmentId: current[request.id]?.equipmentId || "",
                            expectedReturnDate: event.target.value,
                            note: current[request.id]?.note || "",
                            fulfillmentStatus: current[request.id]?.fulfillmentStatus || "waiting_stock",
                            replacementDisposition: current[request.id]?.replacementDisposition || "available",
                            replacementConditionStatus: current[request.id]?.replacementConditionStatus || "",
                          },
                        }))
                      }
                    />
                    <select
                      value={fulfillmentForm[request.id]?.fulfillmentStatus || "waiting_stock"}
                      onChange={(event) =>
                        setFulfillmentForm((current) => ({
                          ...current,
                          [request.id]: {
                            equipmentId: current[request.id]?.equipmentId || "",
                            expectedReturnDate: current[request.id]?.expectedReturnDate || "",
                            note: current[request.id]?.note || "",
                            fulfillmentStatus: event.target.value as FulfillmentStatus,
                            replacementDisposition: current[request.id]?.replacementDisposition || "available",
                            replacementConditionStatus: current[request.id]?.replacementConditionStatus || "",
                          },
                        }))
                      }
                    >
                      <option value="waiting_stock">Waiting for stock</option>
                      <option value="backordered">Backordered</option>
                      <option value="on_hold">On hold</option>
                      <option value="ready">Ready to fulfill</option>
                    </select>
                    <textarea
                      value={fulfillmentForm[request.id]?.note || ""}
                      onChange={(event) =>
                        setFulfillmentForm((current) => ({
                          ...current,
                          [request.id]: {
                            equipmentId: current[request.id]?.equipmentId || "",
                            expectedReturnDate: current[request.id]?.expectedReturnDate || "",
                            note: event.target.value,
                            fulfillmentStatus: current[request.id]?.fulfillmentStatus || "waiting_stock",
                            replacementDisposition: current[request.id]?.replacementDisposition || "available",
                            replacementConditionStatus: current[request.id]?.replacementConditionStatus || "",
                          },
                        }))
                      }
                      placeholder="Fulfillment note, waiting reason, or stock update"
                    />
                    {request.request_type === "replacement" && request.source_equipment_id ? (
                      (() => {
                        const sourceEquipment = equipmentById.get(request.source_equipment_id);

                        return (
                          <>
                            <div className="workflow-step-list">
                              <div className="workflow-step-row">
                                <strong>Current device</strong>
                                <span>
                                  {sourceEquipment
                                    ? `${sourceEquipment.asset_tag} / ${sourceEquipment.equipment_name}`
                                    : "Current device linked to replacement request"}
                                </span>
                              </div>
                              {sourceEquipment && formatEquipmentSpecs(sourceEquipment) ? (
                                <div className="workflow-step-row">
                                  <strong>Current specs</strong>
                                  <span>{formatEquipmentSpecs(sourceEquipment)}</span>
                                </div>
                              ) : null}
                            </div>
                            <select
                              value={fulfillmentForm[request.id]?.replacementDisposition || "available"}
                              onChange={(event) =>
                                setFulfillmentForm((current) => ({
                                  ...current,
                                  [request.id]: {
                                    equipmentId: current[request.id]?.equipmentId || "",
                                    expectedReturnDate: current[request.id]?.expectedReturnDate || "",
                                    note: current[request.id]?.note || "",
                                    fulfillmentStatus: current[request.id]?.fulfillmentStatus || "waiting_stock",
                                    replacementDisposition: event.target.value as ReplacementDisposition,
                                    replacementConditionStatus: current[request.id]?.replacementConditionStatus || "",
                                  },
                                }))
                              }
                            >
                              <option value="available">Old device returns to stock</option>
                              <option value="retired">Old device is disposed</option>
                            </select>
                            <input
                              type="text"
                              value={fulfillmentForm[request.id]?.replacementConditionStatus || ""}
                              onChange={(event) =>
                                setFulfillmentForm((current) => ({
                                  ...current,
                                  [request.id]: {
                                    equipmentId: current[request.id]?.equipmentId || "",
                                    expectedReturnDate: current[request.id]?.expectedReturnDate || "",
                                    note: current[request.id]?.note || "",
                                    fulfillmentStatus: current[request.id]?.fulfillmentStatus || "waiting_stock",
                                    replacementDisposition: current[request.id]?.replacementDisposition || "available",
                                    replacementConditionStatus: event.target.value,
                                  },
                                }))
                              }
                              placeholder="Old device condition, for example battery degraded or screen damaged"
                            />
                          </>
                        );
                      })()
                    ) : null}
                    {!request.booked_equipment_id && getEquipmentOptionsForRequest(request).length === 0 ? (
                      <p className="loading-text">No matching available stock right now. Mark the request as waiting, backordered, or on hold.</p>
                    ) : null}
                    <div className="card-action-row">
                      <button className="primary-btn compact-btn btn-success" type="button" onClick={() => void handleFulfillRequest(request.id)}>
                        Fulfill
                      </button>
                      <button className="secondary-btn compact-btn btn-soft-warning" type="button" onClick={() => void handleUpdateFulfillmentStatus(request.id)}>
                        Save status
                      </button>
                      <button className="secondary-btn compact-btn" type="button" onClick={() => void handleReturnRequestForClarification(request.id)}>
                        Return
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
            </div>
          </div>
          ))
        ) : (
          <p className="loading-text">No records are waiting in this section.</p>
        )}
        {renderPaginationBar(pageKey, requestRows.length, currentPage, pageSize, (page) =>
          setRequestPageByKey((current) => ({
            ...current,
            [pageKey]: page,
          }))
        )}
      </div>
    );
  };

  const renderSmartAlertsPanel = () =>
    !["employee", "hr", "it-manager", "it-support"].includes(roleView) && smartAlerts.length > 0 ? (
      <section className="dashboard-panel">
        <div className="panel-header">
          <h3>Smart Alerts</h3>
          <span>{smartAlerts.length} live alert{smartAlerts.length === 1 ? "" : "s"}</span>
        </div>
        <div className="mini-list">
          {smartAlerts.map((alert, index) => (
            <article className="mini-list-card" key={`${alert.title}-${index}`}>
              <strong>{alert.title}</strong>
              <span className={`status-pill status-${alert.severity === "critical" ? "lost" : alert.severity === "warning" ? "maintenance" : "available"}`}>
                {alert.severity}
              </span>
              <span>{alert.message}</span>
            </article>
          ))}
        </div>
      </section>
    ) : null;

  const renderLifecyclePanel = () => (
    <section className="dashboard-panel">
      <div className="panel-header">
        <h3>Asset Lifecycle History</h3>
        <span>{lifecycleEvents.length} recent events</span>
      </div>
      <div className="mini-list">
        {lifecycleEvents.length > 0 ? (
          lifecycleEvents.slice(0, 10).map((event) => (
            <article className="mini-list-card" key={event.id}>
              <strong>{event.asset_tag}</strong>
              <span>{event.event_label}</span>
              <span>
                {event.from_status || "start"} -&gt; {event.to_status || "recorded"} / {formatProfileDate(event.created_at)}
              </span>
              <span>{event.event_note || event.actor_name || "No extra note."}</span>
            </article>
          ))
        ) : (
          <p className="loading-text">Lifecycle events will appear as assets are registered, assigned, returned, repaired, or retired.</p>
        )}
      </div>
    </section>
  );

  const renderNotificationsSection = () => (
    <section className="dashboard-panel notification-center-panel">
      <div className="panel-header">
        <div>
          <h3>Notification Center</h3>
          <p className="dashboard-subtitle">Recent workflow updates, asset changes, and operational messages appear here.</p>
        </div>
      </div>
      <div className="notification-list">
        {notifications.length > 0 ? (
          notifications.map((item) => (
            <article className="notification-list-card" key={item.id}>
              <div className="notification-list-icon" aria-hidden="true">
                <Bell size={18} strokeWidth={2.4} />
              </div>
              <div>
                <div className="notification-list-head">
                  <strong>{item.title}</strong>
                  <time dateTime={item.created_at}>{formatProfileDate(item.created_at)}</time>
                </div>
                <p>{item.message || "No message was attached to this notification."}</p>
                <span className={`status-pill status-${item.status === "unread" ? "pending" : "fulfilled"}`}>
                  {item.status === "unread" ? "New notification" : item.status}
                </span>
              </div>
            </article>
          ))
        ) : (
          <div className="notification-empty-state">
            <Bell size={24} strokeWidth={2.2} />
            <strong>No notifications yet</strong>
            <p>You are all caught up. New workflow updates will appear here.</p>
          </div>
        )}
      </div>
    </section>
  );

  const renderOverview = () => {
    if (roleView === "branch-manager") {
      return (
        <>
          <section className="dashboard-card-grid">
            <OverviewShortcutCard
              title="Branch Requests"
              value={branchRequests.length}
              description="Total requests created by employees in this branch."
              icon={ClipboardCheck}
              actionLabel="Open branch activity"
              onClick={() => setActiveSection("assets")}
            />
            <OverviewShortcutCard
              title="Pending Approvals"
              value={branchApprovals.length}
              description="Requests currently waiting for branch manager review."
              icon={ShieldCheck}
              actionLabel="Review approvals"
              onClick={() => setActiveSection("approvals")}
            />
            <OverviewShortcutCard
              title="Branch Assets"
              value={branchEquipment.length}
              description="Equipment currently linked to this branch."
              icon={Warehouse}
              actionLabel="View branch assets"
              onClick={() => setActiveSection("assets")}
            />
            <OverviewShortcutCard
              title="Branch Employees"
              value={branchEmployees.length}
              description="Employees in this branch with their assigned equipment accountability."
              icon={Users}
              actionLabel="View employees"
              onClick={() => setActiveSection("employees")}
            />
          </section>
          <section className="dashboard-bottom-row">
            <section className="dashboard-panel">
              <div className="panel-header">
                <h3>Pending Branch Approvals</h3>
              </div>
              {renderRequestCards(branchApprovals, "approve")}
            </section>
          </section>
        </>
      );
    }

    if (roleView === "hr") {
      const employeeCount = requests.reduce((map, request) => map.add(request.requester_id), new Set<number>()).size;

      return (
        <>
          <section className="dashboard-card-grid">
            <OverviewShortcutCard
              title="HR Approvals"
              value={hrApprovals.length}
              description="Requests waiting for HR verification."
              icon={ShieldCheck}
              actionLabel="Review approvals"
              onClick={() => setActiveSection("approvals")}
            />
            <OverviewShortcutCard
              title="Employees Seen"
              value={employees.length || employeeCount}
              description="Employee equipment accountability across branches."
              icon={Users}
              actionLabel="View employees"
              onClick={() => setActiveSection("employees")}
            />
            <OverviewShortcutCard
              title="HR Requests"
              value={requests.filter((request) => request.requester_id === user.id).length}
              description="Requests submitted by HR for onboarding and employee provisioning."
              icon={Send}
              actionLabel="Open my requests"
              onClick={() => setActiveSection("my-requests")}
            />
            <OverviewShortcutCard
              title="Fulfilled Requests"
              value={requests.filter((request) => request.request_status === "fulfilled").length}
              description="Requests already delivered to employees."
              icon={CheckCheck}
              actionLabel="Open reports"
              onClick={() => setActiveSection("reports")}
            />
          </section>
        </>
      );
    }

    if (roleView === "it-manager") {
      return (
        <>
          <section className="dashboard-card-grid">
            <OverviewShortcutCard
              title="IT Approvals"
              value={itApprovals.length}
              description="Requests waiting for technical approval."
              icon={ShieldCheck}
              actionLabel="Review approvals"
              onClick={() => setActiveSection("approvals")}
            />
            <OverviewShortcutCard
              title="Open Issues"
              value={issues.filter((issue) => issue.issue_status !== "closed").length}
              description="Issue tickets still active in the asset lifecycle."
              icon={Wrench}
              actionLabel="Inspect equipment"
              onClick={() => setActiveSection("equipment")}
            />
            <OverviewShortcutCard
              title="Return Checks"
              value={pendingFinalReturnApprovals.length}
              description="Returned devices waiting for IT Director final approval."
              icon={RotateCcw}
              actionLabel="Approve returns"
              onClick={() => setActiveSection("returns")}
            />
            <OverviewShortcutCard
              title="Maintenance Assets"
              value={equipment.filter((item) => item.status === "maintenance").length}
              description="Equipment in maintenance right now."
              icon={TimerReset}
              actionLabel="Open equipment"
              onClick={() => setActiveSection("equipment")}
            />
            <OverviewShortcutCard
              title="Available Equipment"
              value={availableEquipment.length}
              description="Assets available for future approval and assignment."
              icon={Warehouse}
              actionLabel="View inventory"
              onClick={() => setActiveSection("equipment")}
            />
          </section>
          <section className="dashboard-bottom-row">
            <section className="dashboard-panel">
              <div className="panel-header">
                <h3>Pending IT Approvals</h3>
              </div>
              {renderRequestCards(itApprovals, "approve")}
            </section>
          </section>
        </>
      );
    }

    if (roleView === "it-support") {
      return (
        <>
          <section className="dashboard-card-grid dashboard-card-grid-storekeeper">
            <OverviewShortcutCard
              title="Approval Queue"
              value={itSupportApprovals.length}
              description="Requests waiting for IT Support Engineer approval after HR review."
              icon={ShieldCheck}
              actionLabel="Review approvals"
              onClick={() => setActiveSection("approvals")}
            />
            <OverviewShortcutCard
              title="Store Operations"
              value={localAvailableEquipment.length}
              description="Live branch stock currently available for issue or reservation."
              icon={PackageCheck}
              kicker="Control Center"
              actionLabel="Open stock"
              onClick={() => setActiveSection("stock")}
            />
            <OverviewShortcutCard
              title="Fulfillment Queue"
              value={fulfillmentRequests.length}
              description="Requests that reached the IT support delivery stage."
              icon={FolderInput}
              actionLabel="Open fulfillment"
              onClick={() => setActiveSection("fulfillment")}
            />
            <OverviewShortcutCard
              title="Return Intake"
              value={pendingItReturnReviews.length + pendingReturnIntake.length}
              description="Returned equipment waiting for IT Support receipt, assessment, or legacy intake."
              icon={RotateCcw}
              actionLabel="Process returns"
              onClick={() => setActiveSection("returns")}
            />
            <OverviewShortcutCard
              title="Available Stock"
              value={localAvailableEquipment.length}
              description="Equipment available in this branch for issue."
              icon={Boxes}
              actionLabel="View stock"
              onClick={() => setActiveSection("stock")}
            />
            <OverviewShortcutCard
              title="Active Assignments"
              value={assignments.filter((assignment) => assignment.status === "active").length}
              description="Assets already assigned to employees."
              icon={UserRound}
              actionLabel="Open reports"
              onClick={() => setActiveSection("reports")}
            />
            <OverviewShortcutCard
              title="Fulfilled Requests"
              value={requests.filter((request) => request.request_status === "fulfilled").length}
              description="Requests delivered through the workflow."
              icon={CheckCheck}
              actionLabel="View timeline"
              onClick={() => setActiveSection("timeline")}
            />
          </section>
        </>
      );
    }

    return (
      <>
        <section className="dashboard-card-grid">
          <OverviewShortcutCard
            title="My Requests"
            value={employeeRequests.length}
            description="Total equipment requests you have submitted."
            icon={Send}
            actionLabel="Open my requests"
            onClick={() => setActiveSection("my-requests")}
          />
          <OverviewShortcutCard
            title="Pending"
            value={employeeRequests.filter((request) => request.request_status === "pending").length}
            description="Requests still moving through approval stages."
            icon={ShieldCheck}
            actionLabel="Track timeline"
            onClick={() => setActiveSection("timeline")}
          />
          <OverviewShortcutCard
            title="Assigned"
            value={employeeAssignments.filter((assignment) => assignment.status === "active").length}
            description="Assets that are currently assigned to you."
            icon={Warehouse}
            actionLabel="Open my equipment"
            onClick={() => setActiveSection("my-equipment")}
          />
          <OverviewShortcutCard
            title="Fulfilled"
            value={employeeRequests.filter((request) => request.request_status === "fulfilled").length}
            description="Requests already completed and delivered."
            icon={PackageCheck}
            actionLabel="View completed requests"
            onClick={() => setActiveSection("my-requests")}
          />
          <OverviewShortcutCard
            title="Returns"
            value={employeeReturnRequests.filter((item) => item.return_status === "requested").length}
            description="Equipment return requests currently waiting for store intake."
            icon={RotateCcw}
            actionLabel="Open returns"
            onClick={() => setActiveSection("return-requests")}
          />
        </section>
      </>
    );
  };

  const renderActionSection = () => {
    if (roleView === "branch-manager") {
      return (
        <section className="dashboard-panel">
          <div className="panel-header">
            <h3>Branch Manager Approvals</h3>
          </div>
          {renderRequestCards(branchApprovals, "approve")}
        </section>
      );
    }

    if (roleView === "hr") {
      if (activeSection === "new-request") {
        return (
          <section className="dashboard-panel">
            <div className="panel-header">
              <h3>{editingRequestId ? "Update HR Equipment Request" : "Create HR Equipment Request"}</h3>
            </div>
            <form className="simple-form" onSubmit={handleCreateRequest}>
              <label className="field">
                <span>Request date</span>
                <input
                  type="date"
                  value={requestForm.requestDate}
                  min={todayDateValue}
                  max={todayDateValue}
                  onChange={(event) => setRequestForm((current) => ({ ...current, requestDate: event.target.value }))}
                  disabled={Boolean(editingRequestId)}
                  required
                />
              </label>
              <label className="field">
                <span>Employee</span>
                <select
                  value={requestForm.targetEmployeeUserId}
                  onChange={(event) => setRequestForm((current) => ({ ...current, targetEmployeeUserId: event.target.value }))}
                  required
                >
                  <option value="">Select employee</option>
                  {employees.map((employee) => (
                    <option key={employee.id} value={employee.id}>
                      {employee.full_name} / {employee.employee_code || employee.email}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Request type</span>
                <select
                  value={requestForm.requestType}
                  onChange={(event) =>
                    setRequestForm((current) => ({
                      ...current,
                      requestType: event.target.value as RequestFormState["requestType"],
                    }))
                  }
                >
                  <option value="new_hire">New hire</option>
                  <option value="standard">Standard</option>
                  <option value="replacement">Replacement</option>
                </select>
              </label>
              <label className="field">
                <span>Expected device specs</span>
                <textarea
                  value={requestForm.expectedDeviceSpecs}
                  onChange={(event) => setRequestForm((current) => ({ ...current, expectedDeviceSpecs: event.target.value }))}
                  placeholder="Example: Core i7, 16GB RAM, 512GB SSD, webcam, VPN-ready, developer tools"
                />
              </label>
              <label className="field">
                <span>Equipment category</span>
                <select
                  value={requestForm.categoryId}
                  onChange={(event) => setRequestForm((current) => ({ ...current, categoryId: event.target.value }))}
                  required
                >
                  <option value="">Select category</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>HR note</span>
                <textarea
                  value={requestForm.notes}
                  onChange={(event) => setRequestForm((current) => ({ ...current, notes: event.target.value }))}
                  placeholder="Describe the onboarding need, role context, and any required specs"
                />
              </label>
              <button className="primary-btn form-submit-btn" type="submit">
                {editingRequestId ? "Save request" : "Submit request"}
              </button>
              {editingRequestId ? (
                <button
                  className="secondary-btn form-submit-btn"
                  type="button"
                  onClick={() => {
                    setEditingRequestId(null);
                    setRequestForm({
                      categoryId: "",
                      requestType: "new_hire",
                      targetEmployeeUserId: "",
                      expectedDeviceSpecs: "",
                      notes: "",
                      requestDate: todayDateValue,
                      sourceEquipmentId: "",
                      reportType: "loss",
                      incidentScope: "during_work",
                    });
                  }}
                >
                  Cancel edit
                </button>
              ) : null}
            </form>
          </section>
        );
      }

      if (activeSection === "approvals") {
        return (
          <section className="dashboard-panel">
            <div className="panel-header">
              <h3>HR Approvals</h3>
            </div>
            {renderRequestCards(hrApprovals, "approve")}
          </section>
        );
      }

      return (
        <section className="dashboard-panel">
          <div className="panel-header">
            <h3>HR Submitted Requests</h3>
          </div>
          {renderRequestCards(requests.filter((request) => request.requester_id === user.id), "view")}
        </section>
      );
    }

    if (roleView === "it-manager") {
      return (
        <section className="dashboard-panel">
          <div className="panel-header">
            <h3>IT Approvals</h3>
          </div>
          {renderRequestCards(itApprovals, "approve")}
        </section>
      );
    }

    if (roleView === "it-support") {
      return (
        <section className="dashboard-panel">
          <div className="panel-header">
            <h3>{activeSection === "approvals" ? "IT Support Approvals" : "Store Fulfillment"}</h3>
          </div>
          {activeSection === "approvals"
            ? renderRequestCards(itSupportApprovals, "approve")
            : renderRequestCards(fulfillmentRequests, "fulfill")}
        </section>
      );
    }

    return (
      <section className="dashboard-panel">
        <div className="panel-header">
          <h3>{editingRequestId ? "Update Equipment Request" : "New Equipment Request"}</h3>
        </div>
        {(() => {
          const selectedSourceAssignment = employeeActiveAssignmentOptions.find(
            (item) => item.assignment.equipment_id === Number(requestForm.sourceEquipmentId),
          );
          const sourceEquipment = selectedSourceAssignment?.equipment || null;
          const isReplacementFlow = requestForm.requestType === "replacement";
          const isLossTheftFlow = requestForm.requestType === "loss_theft";

          return (
        <form className="simple-form" onSubmit={handleCreateRequest}>
          <label className="field">
            <span>Request date</span>
            <input
              type="date"
              value={requestForm.requestDate}
              min={todayDateValue}
              max={todayDateValue}
              onChange={(event) => setRequestForm((current) => ({ ...current, requestDate: event.target.value }))}
              disabled={Boolean(editingRequestId)}
              required
            />
          </label>
          <label className="field">
            <span>Request type</span>
            <select
              value={requestForm.requestType}
              onChange={(event) =>
                setRequestForm((current) => ({
                  ...current,
                  requestType: event.target.value as RequestFormState["requestType"],
                }))
              }
            >
              <option value="standard">Standard</option>
              <option value="replacement">Replacement</option>
              <option value="loss_theft">Loss or theft</option>
            </select>
          </label>
          {isReplacementFlow || isLossTheftFlow ? (
            <label className="field">
              <span>Current device</span>
              <select
                value={requestForm.sourceEquipmentId}
                onChange={(event) =>
                  setRequestForm((current) => {
                    const selectedAssignment = employeeActiveAssignmentOptions.find(
                      (item) => item.assignment.equipment_id === Number(event.target.value),
                    );

                    return {
                      ...current,
                      sourceEquipmentId: event.target.value,
                      categoryId: selectedAssignment ? String(selectedAssignment.equipment.category_id) : current.categoryId,
                    };
                  })
                }
                required
              >
                <option value="">Select your current assigned device</option>
                {employeeActiveAssignmentOptions.map(({ assignment, equipment }) => (
                  <option key={assignment.id} value={assignment.equipment_id}>
                    {assignment.asset_tag} / {assignment.equipment_name} / {formatEquipmentSpecs(equipment) || "No specs"}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          {sourceEquipment ? (
            <div className="workflow-step-list">
              <div className="workflow-step-row">
                <strong>Current device</strong>
                <span>{sourceEquipment.asset_tag} / {sourceEquipment.equipment_name}</span>
              </div>
              {formatEquipmentSpecs(sourceEquipment) ? (
                <div className="workflow-step-row">
                  <strong>Specs</strong>
                  <span>{formatEquipmentSpecs(sourceEquipment)}</span>
                </div>
              ) : null}
            </div>
          ) : null}
          {isLossTheftFlow ? (
            <>
              <label className="field">
                <span>Incident type</span>
                <select
                  value={requestForm.reportType}
                  onChange={(event) =>
                    setRequestForm((current) => ({
                      ...current,
                      reportType: event.target.value as "loss" | "theft",
                    }))
                  }
                >
                  <option value="loss">Loss</option>
                  <option value="theft">Theft</option>
                </select>
              </label>
              <label className="field">
                <span>Incident scope</span>
                <select
                  value={requestForm.incidentScope}
                  onChange={(event) =>
                    setRequestForm((current) => ({
                      ...current,
                      incidentScope: event.target.value as "during_work" | "outside_work",
                    }))
                  }
                >
                  <option value="during_work">During work</option>
                  <option value="outside_work">Outside work</option>
                </select>
              </label>
              <p className="dashboard-subtitle">
                Theft during work will be handled as a work incident. Theft outside work should follow company terms and conditions.
              </p>
            </>
          ) : null}
          {isLossTheftFlow ? null : (
            <label className="field">
              <span>{isReplacementFlow ? "Expected new device specs" : "Expected device specs"}</span>
              <textarea
                value={requestForm.expectedDeviceSpecs}
                onChange={(event) => setRequestForm((current) => ({ ...current, expectedDeviceSpecs: event.target.value }))}
                placeholder="Example: Core i5, 8GB RAM, 256GB SSD, dock, extra monitor, approved software"
              />
            </label>
          )}
          <label className="field">
            <span>Equipment category</span>
            <select
              value={requestForm.categoryId}
              onChange={(event) => setRequestForm((current) => ({ ...current, categoryId: event.target.value }))}
              disabled={isReplacementFlow || isLossTheftFlow}
              required
            >
              <option value="">Select category</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>
              {isReplacementFlow
                ? "Reason for replacement"
                : isLossTheftFlow
                  ? "Incident details"
                  : "Business note"}
            </span>
            <textarea
              value={requestForm.notes}
              onChange={(event) => setRequestForm((current) => ({ ...current, notes: event.target.value }))}
              placeholder={
                isReplacementFlow
                  ? "Explain why the current device should be replaced, for example damaged screen, battery issue, or motherboard fault"
                  : isLossTheftFlow
                    ? "Explain what happened, where it happened, and any supporting details"
                    : "Explain why you need this equipment"
              }
              required={isReplacementFlow || isLossTheftFlow}
            />
          </label>
          <button className="primary-btn form-submit-btn" type="submit">
            {editingRequestId ? "Save request" : "Submit request"}
          </button>
          {editingRequestId ? (
            <button
              className="secondary-btn form-submit-btn"
              type="button"
              onClick={() => {
                setEditingRequestId(null);
                setRequestForm({
                  categoryId: "",
                  requestType: "standard",
                  targetEmployeeUserId: "",
                  expectedDeviceSpecs: "",
                  notes: "",
                  requestDate: todayDateValue,
                  sourceEquipmentId: "",
                  reportType: "loss",
                  incidentScope: "during_work",
                });
              }}
            >
              Cancel edit
            </button>
          ) : null}
        </form>
          );
        })()}
      </section>
    );
  };

  const renderEmployeeEquipmentDirectory = (employeeRows: EmployeeRow[], title: string, emptyText: string) => (
    <section className="dashboard-panel">
      <div className="panel-header">
        <h3>{title}</h3>
        <span>{employeeRows.length} employee{employeeRows.length === 1 ? "" : "s"}</span>
      </div>
      <p className="dashboard-subtitle">
        Review who has equipment, who has none, receipt status, expected return dates, and return/maintenance activity.
      </p>
      <div className="mini-list stock-grid">
        {employeeRows.length > 0 ? (
          employeeRows.map((employee) => {
            const employeeEquipment = getAssignmentsForEmployee(employee.id);
            const activeEmployeeEquipment = employeeEquipment.filter((assignment) => assignment.status === "active");
            const employeeReturns = returns.filter((item) => item.employee_user_id === employee.id);

            return (
              <article className="mini-list-card action-card stock-card" key={employee.id}>
                <strong>{employee.full_name}</strong>
                <span>{employee.email}</span>
                <span>
                  {employee.job_title || "No job title"} / {employee.department_name || "No department"}
                </span>
                <span>
                  {employee.branch_name || "No branch"} / {employee.office_location || "No office location"}
                </span>
                <span>
                  Active equipment: {activeEmployeeEquipment.length} / Total assigned records: {employeeEquipment.length}
                </span>
                {activeEmployeeEquipment.length > 0 ? (
                  activeEmployeeEquipment.map((assignment) => (
                    <div className="workflow-step-list" key={assignment.id}>
                      <div className="workflow-step-row">
                        <strong>{assignment.asset_tag}</strong>
                        <span>{assignment.equipment_name} / receipt {assignment.receipt_status} / return {formatProfileDate(assignment.expected_return_date)}</span>
                      </div>
                      {formatAssignmentEquipmentSpecs(assignment) ? (
                        <div className="workflow-step-row">
                          <strong>Device specs</strong>
                          <span>{formatAssignmentEquipmentSpecs(assignment)}</span>
                        </div>
                      ) : null}
                      <div className="workflow-step-row">
                        <strong>Depreciation</strong>
                        <span>{getAssignmentDepreciationSummary(assignment)}</span>
                      </div>
                      <div className="card-action-row">
                        <button className="secondary-btn compact-btn" type="button" onClick={() => void handlePreviewEquipmentQr(buildEquipmentRowFromAssignment(assignment), activeSection)}>
                          QR code
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <span>No active equipment assigned.</span>
                )}
                {employeeReturns.length > 0 ? (
                  <span>
                    Return activity: {employeeReturns.map((item) => formatReturnStatus(item.return_status)).join(", ")}
                  </span>
                ) : null}
              </article>
            );
          })
        ) : (
          <p className="loading-text">{emptyText}</p>
        )}
      </div>
      <div className="qr-panel dashboard-qr-panel" id="equipment-qr-panel">
        <div className="panel-header">
          <h3>Equipment QR</h3>
        </div>
        {isEquipmentQrLoading ? (
          <p className="loading-text">Generating item QR code...</p>
        ) : equipmentQrError ? (
          <p className="error-text">{equipmentQrError}</p>
        ) : selectedQrEquipment && equipmentQrImageUrl ? (
          <div className={`qr-card stacked-qr-card${selectedQrAudience === "employee" ? " employee-qr-card" : ""}`}>
            <div className="qr-preview">
              <img src={equipmentQrImageUrl} alt={`${selectedQrEquipment.asset_tag} QR code`} />
            </div>
            <div className="qr-details">
              <span className="qr-eyebrow">Employee Device Pass</span>
              <h4>{selectedQrEquipment.equipment_name}</h4>
              <p><strong>Asset tag:</strong> {selectedQrEquipment.asset_tag}</p>
              <p><strong>Serial number:</strong> {selectedQrEquipment.serial_number}</p>
              <p><strong>Model:</strong> {selectedQrEquipment.model_name || "Not set"}</p>
              <p><strong>Computer name:</strong> {selectedQrEquipment.computer_name || "Not set"}</p>
              <p><strong>Specs:</strong> {formatEquipmentSpecs(selectedQrEquipment) || "Not set"}</p>
              <p><strong>Warranty end:</strong> {formatQrDate(selectedQrEquipment.warranty_end_date)}</p>
              <p className="qr-footnote">Scan for employee-facing device identification only.</p>
              <button className="primary-btn qr-download-btn" type="button" onClick={handleDownloadEquipmentQr}>
                Download QR
              </button>
            </div>
          </div>
        ) : (
          <p className="loading-text">Select an assigned item to preview its QR code.</p>
        )}
      </div>
    </section>
  );

  const renderSecondarySection = () => {
    if (roleView === "branch-manager") {
      if (activeSection === "employees") {
        return renderEmployeeEquipmentDirectory(
          branchEmployees,
          "Branch Employees And Equipment",
          "No employees are assigned to this branch yet.",
        );
      }

      return (
        <section className="dashboard-panel">
          <div className="panel-header">
            <h3>Branch Assets</h3>
          </div>
          <div className="subpanel-header">
            <h4>Assigned Items</h4>
            <span>{branchAssignedEquipment.length} assigned</span>
          </div>
          <div className="user-table workflow-assignment-table">
            <div className="user-table-head workflow-assignment-table-head">
              <span>Asset</span>
              <span>Status / Type</span>
              <span>Assigned To</span>
              <span>Assigned / Return</span>
              <span>Depreciation</span>
              <span>Specs</span>
              <span>Actions</span>
            </div>
            {branchAssignedEquipment.length > 0 ? (
              branchAssignedEquipment.map((item) => {
                const assignment = branchAssignmentMap.get(item.id);

                return (
                  <div className="user-table-row workflow-assignment-table-row" key={item.id}>
                    <div className="user-primary-cell">
                      <strong>{item.asset_tag}</strong>
                      <span>{item.serial_number}</span>
                    </div>
                    <div className="user-secondary-cell">
                      <strong>{item.equipment_name}</strong>
                      <span>
                        <span className={`status-pill status-${item.status}`}>{item.status}</span>
                      </span>
                    </div>
                    <div className="user-secondary-cell">
                      <strong>{assignment?.employee_name || "Not assigned"}</strong>
                      <span>{assignment?.employee_email || "No email"}</span>
                    </div>
                    <div className="user-secondary-cell">
                      <strong>{assignment?.assigned_at ? assignment.assigned_at.slice(0, 10) : "Not set"}</strong>
                      <span>Return: {assignment?.expected_return_date ? assignment.expected_return_date.slice(0, 10) : "Not set"}</span>
                    </div>
                    <div className="user-secondary-cell">
                      <strong>{getEquipmentDepreciationSummary(item)}</strong>
                      <span>{getEquipmentDepreciationDetail(item)}</span>
                    </div>
                    <div className="user-secondary-cell">
                      <strong>{item.category_name || "No category"}</strong>
                      <span>{formatEquipmentSpecs(item) || "No specs"}</span>
                    </div>
                    <div className="table-action-group workflow-stock-table-actions">
                      {assignment ? (
                        <button
                          className="table-action"
                          type="button"
                          onClick={() => setSelectedBranchEmployeeId(assignment.employee_user_id)}
                        >
                          View history
                        </button>
                      ) : null}
                      <button className="table-action" type="button" onClick={() => void openDetailPanel("equipment", item.id)}>
                        View details
                      </button>
                      <button className="table-action" type="button" onClick={() => void handlePreviewEquipmentQr(item)}>
                        QR code
                      </button>
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="loading-text">No active assigned items in this branch right now.</p>
            )}
          </div>

          <div className="subpanel-header">
            <h4>Available Items</h4>
            <span>{branchAvailableEquipment.length} available</span>
          </div>
          <div className="user-table workflow-stock-table">
            <div className="user-table-head workflow-stock-table-head">
              <span>Asset</span>
              <span>Status / Type</span>
              <span>Location</span>
              <span>Cost / Warranty</span>
              <span>Depreciation</span>
              <span>Lifespan / Replace By</span>
              <span>Notes</span>
              <span>Actions</span>
            </div>
            {branchAvailableEquipment.length > 0 ? (
              branchAvailableEquipment.map((item) => (
                <div className="user-table-row workflow-stock-table-row" key={item.id}>
                  <div className="user-primary-cell">
                    <strong>{item.asset_tag}</strong>
                    <span>{item.serial_number}</span>
                  </div>
                  <div className="user-secondary-cell">
                    <strong>{item.equipment_name}</strong>
                    <span>
                      <span className={`status-pill status-${item.status}`}>{item.status}</span>
                    </span>
                  </div>
                  <div className="user-secondary-cell">
                    <strong>{item.category_name || "No category"}</strong>
                    <span>{item.branch_name || "No branch"}</span>
                  </div>
                  <div className="user-secondary-cell">
                    <strong>{item.purchase_cost ? Number(item.purchase_cost).toLocaleString() : "0"}</strong>
                    <span>Warranty: {item.warranty_end_date ? item.warranty_end_date.slice(0, 10) : "Not set"}</span>
                  </div>
                  <div className="user-secondary-cell">
                    <strong>{getEquipmentDepreciationSummary(item)}</strong>
                    <span>{getEquipmentDepreciationDetail(item)}</span>
                  </div>
                  <div className="user-secondary-cell">
                    <strong>{item.lifespan_years ?? 4} years</strong>
                    <span>{getReplacementDate(item.purchase_date, item.lifespan_years, item.purchase_year)}</span>
                  </div>
                  <div className="user-secondary-cell">
                    <strong>{getReplacementStockLabel(item) || "Ready for assignment"}</strong>
                    <span>{item.replacement_condition_status || "No replacement note"}</span>
                  </div>
                  <div className="table-action-group workflow-stock-table-actions">
                    <button className="table-action" type="button" onClick={() => void openDetailPanel("equipment", item.id)}>
                      View details
                    </button>
                    <button className="table-action" type="button" onClick={() => void handlePreviewEquipmentQr(item)}>
                      QR code
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <p className="loading-text">No available items are left in this branch.</p>
            )}
          </div>

          <div className="dashboard-panel embedded-panel">
            <div className="subpanel-header">
              <h4>Employee Assignment History</h4>
              {selectedBranchEmployee ? (
                <button
                  className="secondary-btn compact-btn"
                  type="button"
                  onClick={() => setSelectedBranchEmployeeId(null)}
                >
                  Close history
                </button>
              ) : null}
            </div>
            {selectedBranchEmployee ? (
              <div className="mini-list">
                <article className="mini-list-card">
                  <strong>{selectedBranchEmployee.employee_name}</strong>
                  <span>{selectedBranchEmployee.employee_email}</span>
                  <span>
                    {selectedBranchEmployeeAssignments.filter((assignment) => assignment.status === "active").length} active /
                    {" "}
                    {selectedBranchEmployeeAssignments.length} total branch assignments
                  </span>
                </article>
                {selectedBranchEmployeeAssignments.map((assignment) => (
                  <article className="mini-list-card action-card" key={assignment.id}>
                    <strong>{assignment.asset_tag}</strong>
                    <span>{assignment.equipment_name} / {assignment.status}</span>
                    <span>
                      Assigned on: {assignment.assigned_at.slice(0, 10)} / Return: {assignment.expected_return_date ? assignment.expected_return_date.slice(0, 10) : "Not set"}
                    </span>
                    <span>
                      Issued by: {assignment.assigned_by_name} / Branch: {assignment.branch_name || "No branch"}
                    </span>
                    {assignment.notes ? <span>{assignment.notes}</span> : null}
                  </article>
                ))}
              </div>
            ) : (
              <p className="loading-text">Select an assigned employee from the asset table to view their assignment history.</p>
            )}
          </div>

          <div className="qr-panel dashboard-qr-panel" id="equipment-qr-panel">
            <div className="panel-header">
              <h3>Equipment QR</h3>
            </div>
            {isEquipmentQrLoading ? (
              <p className="loading-text">Generating item QR code...</p>
            ) : equipmentQrError ? (
              <p className="error-text">{equipmentQrError}</p>
            ) : selectedQrEquipment && equipmentQrImageUrl ? (
              <div className="qr-card stacked-qr-card">
                <div className="qr-preview">
                  <img src={equipmentQrImageUrl} alt={`${selectedQrEquipment.asset_tag} QR code`} />
                </div>
                <div className="qr-details">
                  <p>
                    <strong>Asset tag:</strong> {selectedQrEquipment.asset_tag}
                  </p>
                  <p>
                    <strong>Serial number:</strong> {selectedQrEquipment.serial_number}
                  </p>
                  <p>
                    <strong>Equipment:</strong> {selectedQrEquipment.equipment_name}
                  </p>
                  <p>
                    <strong>Category:</strong> {selectedQrEquipment.category_name || "Not set"}
                  </p>
                  <p>
                    <strong>Location:</strong> {selectedQrEquipment.branch_name || "No branch"}
                  </p>
                  <p>
                    <strong>Purchase date:</strong> {formatQrDate(selectedQrEquipment.purchase_date)}
                  </p>
                  <p>
                    <strong>Purchase year:</strong> {selectedQrEquipment.purchase_year || "Not set"}
                  </p>
                  <p>
                    <strong>Purchase cost:</strong> {Number(selectedQrEquipment.purchase_cost ?? 0).toLocaleString()}
                  </p>
                  <p>
                    <strong>Annual depreciation:</strong> {getEquipmentDepreciationSummary(selectedQrEquipment)}
                  </p>
                  <p>
                    <strong>Depreciation detail:</strong> {getEquipmentDepreciationDetail(selectedQrEquipment)}
                  </p>
                  <p>
                    <strong>Computer name:</strong> {selectedQrEquipment.computer_name || "Not set"}
                  </p>
                  <p>
                    <strong>Vendor / Model:</strong> {selectedQrEquipment.vendor_name || "Not set"} / {selectedQrEquipment.model_name || "Not set"}
                  </p>
                  <p>
                    <strong>Device health:</strong> {selectedQrEquipment.device_health || "Not set"}
                  </p>
                  <p>
                    <strong>Detailed location:</strong> {selectedQrEquipment.location_details || "Not set"}
                  </p>
                  <p>
                    <strong>Warranty end:</strong> {formatQrDate(selectedQrEquipment.warranty_end_date)}
                  </p>
                  <p>
                    <strong>Lifespan:</strong> {selectedQrEquipment.lifespan_years ?? 4} years
                  </p>
                  <p>
                    <strong>Replacement target:</strong> {getReplacementDate(selectedQrEquipment.purchase_date, selectedQrEquipment.lifespan_years, selectedQrEquipment.purchase_year)}
                  </p>
                  <button className="primary-btn qr-download-btn" type="button" onClick={handleDownloadEquipmentQr}>
                    Download QR
                  </button>
                </div>
              </div>
            ) : (
              <p className="loading-text">Select an assigned or available item to preview its QR code.</p>
            )}
          </div>
        </section>
      );
    }

    if (roleView === "hr") {
      if (activeSection === "my-requests") {
        return (
          <section className="dashboard-panel">
            <div className="panel-header">
              <h3>HR Submitted Requests</h3>
            </div>
            {renderRequestCards(requests.filter((request) => request.requester_id === user.id), "view")}
          </section>
        );
      }

      return (
        <section className="dashboard-panel">
          <div className="panel-header">
            <div>
              <h3>Employee Directory</h3>
              <p className="dashboard-subtitle">Store HRMS information here, then create the employee's equipment request from the HR workspace.</p>
            </div>
            <div className="panel-header-actions">
              <button className="primary-btn compact-btn" type="button" onClick={openEmployeeModal}>
                Add Employee
              </button>
            </div>
          </div>

          <div className="subpanel-header">
            <h4>Registered Employees</h4>
            <span>{employees.length} employees</span>
          </div>
          <div className="mini-list stock-grid">
            {employees.length > 0 ? (
              employees.map((employee) => {
                const employeeEquipment = getAssignmentsForEmployee(employee.id);
                const activeEmployeeEquipment = employeeEquipment.filter((assignment) => assignment.status === "active");

                return (
                  <article className="mini-list-card action-card stock-card" key={employee.id}>
                    <strong>{employee.full_name}</strong>
                    <span>{employee.employee_code || "No employee code"} / {employee.email}</span>
                    <span>{employee.job_title || "No job title"} / {employee.department_name || "No department"}</span>
                    <span>{employee.office_location || "No office location"} / {employee.hrms_employee_id || "No HRMS id"}</span>
                    <span>Status: {employee.status || "active"} / Start: {formatProfileDate(employee.start_date)}</span>
                    <span>Active equipment: {activeEmployeeEquipment.length}</span>
                    {activeEmployeeEquipment.length > 0 ? (
                      activeEmployeeEquipment.map((assignment) => (
                        <div className="workflow-step-list" key={assignment.id}>
                          <div className="workflow-step-row">
                            <strong>{assignment.asset_tag}</strong>
                            <span>{assignment.equipment_name} / receipt {assignment.receipt_status}</span>
                          </div>
                          {formatAssignmentEquipmentSpecs(assignment) ? (
                            <div className="workflow-step-row">
                              <strong>Device specs</strong>
                              <span>{formatAssignmentEquipmentSpecs(assignment)}</span>
                            </div>
                          ) : null}
                          <div className="card-action-row">
                            <button className="secondary-btn compact-btn" type="button" onClick={() => openDetailPanel("employee", employee.id)}>
                              View details
                            </button>
                            <button className="secondary-btn compact-btn" type="button" onClick={() => void handlePreviewEquipmentQr(buildEquipmentRowFromAssignment(assignment), activeSection)}>
                              QR code
                            </button>
                          </div>
                        </div>
                      ))
                    ) : null}
                    <div className="card-action-row">
                      <button className="secondary-btn compact-btn" type="button" onClick={() => openDetailPanel("employee", employee.id)}>
                        View details
                      </button>
                      <button className="secondary-btn compact-btn" type="button" onClick={() => handleEditEmployee(employee)}>
                        Edit
                      </button>
                      <button
                        className="secondary-btn compact-btn btn-soft-warning"
                        type="button"
                        onClick={() => {
                          setRequestForm((current) => ({
                            ...current,
                            requestType: "new_hire",
                            targetEmployeeUserId: String(employee.id),
                          }));
                          setActiveSection("new-request");
                        }}
                      >
                        Request equipment
                      </button>
                    </div>
                  </article>
                );
              })
            ) : (
              <p className="loading-text">No employees are available yet.</p>
            )}
          </div>
          <div className="qr-panel dashboard-qr-panel" id="equipment-qr-panel">
            <div className="panel-header">
              <h3>Equipment QR</h3>
            </div>
            {isEquipmentQrLoading ? (
              <p className="loading-text">Generating item QR code...</p>
            ) : equipmentQrError ? (
              <p className="error-text">{equipmentQrError}</p>
            ) : selectedQrEquipment && equipmentQrImageUrl ? (
              <div className="qr-card stacked-qr-card">
                <div className="qr-preview">
                  <img src={equipmentQrImageUrl} alt={`${selectedQrEquipment.asset_tag} QR code`} />
                </div>
                <div className="qr-details">
                  <p><strong>Asset tag:</strong> {selectedQrEquipment.asset_tag}</p>
                  <p><strong>Serial number:</strong> {selectedQrEquipment.serial_number}</p>
                  <p><strong>Equipment:</strong> {selectedQrEquipment.equipment_name}</p>
                  <p><strong>Specs:</strong> {formatEquipmentSpecs(selectedQrEquipment) || "Not set"}</p>
                  <button className="primary-btn qr-download-btn" type="button" onClick={handleDownloadEquipmentQr}>
                    Download QR
                  </button>
                </div>
              </div>
            ) : (
              <p className="loading-text">Select an assigned employee device to preview its QR code.</p>
            )}
          </div>

          {isEmployeeModalOpen ? (
            <div className="session-warning-overlay hr-modal-overlay" role="presentation" onClick={resetEmployeeForm}>
              <div
                className="session-warning-card hr-modal-card"
                role="dialog"
                aria-modal="true"
                aria-labelledby="hr-employee-modal-title"
                onClick={(event) => event.stopPropagation()}
              >
                <p className="session-warning-kicker">{editingEmployeeId ? "Update Employee" : "HRMS Registration"}</p>
                <h2 id="hr-employee-modal-title">{editingEmployeeId ? "Edit employee profile" : "Add employee profile"}</h2>
                <p className="hr-modal-intro">Capture the employee's HRMS information here before starting any equipment request.</p>
                <form className="simple-form hr-modal-form" onSubmit={handleSubmitEmployee}>
                  <label className="field">
                    <span>First name</span>
                    <input value={employeeForm.firstName} onChange={(event) => setEmployeeForm((current) => ({ ...current, firstName: event.target.value }))} required />
                  </label>
                  <label className="field">
                    <span>Last name</span>
                    <input value={employeeForm.lastName} onChange={(event) => setEmployeeForm((current) => ({ ...current, lastName: event.target.value }))} required />
                  </label>
                  <label className="field">
                    <span>Email</span>
                    <input type="email" value={employeeForm.email} onChange={(event) => setEmployeeForm((current) => ({ ...current, email: event.target.value }))} required />
                  </label>
                  <label className="field">
                    <span>Phone number</span>
                    <input value={employeeForm.phoneNumber} onChange={(event) => setEmployeeForm((current) => ({ ...current, phoneNumber: event.target.value }))} />
                  </label>
                  <label className="field">
                    <span>Employee code</span>
                    <input value={employeeForm.employeeCode} onChange={(event) => setEmployeeForm((current) => ({ ...current, employeeCode: event.target.value }))} />
                  </label>
                  <label className="field">
                    <span>HRMS employee id</span>
                    <input value={employeeForm.hrmsEmployeeId} onChange={(event) => setEmployeeForm((current) => ({ ...current, hrmsEmployeeId: event.target.value }))} />
                  </label>
                  <label className="field">
                    <span>Employee grade</span>
                    <input value={employeeForm.employeeGrade} onChange={(event) => setEmployeeForm((current) => ({ ...current, employeeGrade: event.target.value }))} />
                  </label>
                  <label className="field">
                    <span>Job title</span>
                    <input value={employeeForm.jobTitle} onChange={(event) => setEmployeeForm((current) => ({ ...current, jobTitle: event.target.value }))} />
                  </label>
                  <label className="field">
                    <span>Employment status</span>
                    <input value={employeeForm.employmentStatus} onChange={(event) => setEmployeeForm((current) => ({ ...current, employmentStatus: event.target.value }))} />
                  </label>
                  <label className="field">
                    <span>Office location</span>
                    <input value={employeeForm.officeLocation} onChange={(event) => setEmployeeForm((current) => ({ ...current, officeLocation: event.target.value }))} />
                  </label>
                  <label className="field">
                    <span>Start date</span>
                    <input type="date" value={employeeForm.startDate} onChange={(event) => setEmployeeForm((current) => ({ ...current, startDate: event.target.value }))} />
                  </label>
                  <div className="session-warning-actions hr-modal-actions">
                    <button className="primary-btn compact-btn" type="submit">
                      {editingEmployeeId ? "Save Employee" : "Create Employee"}
                    </button>
                    <button className="secondary-btn compact-btn" type="button" onClick={resetEmployeeForm}>
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          ) : null}
        </section>
      );
    }

    if (roleView === "it-manager") {
      return (
        <section className="dashboard-panel">
          <div className="panel-header">
            <h3>Issue And Equipment Management</h3>
          </div>
          <form className="simple-form" onSubmit={handleSubmitIssue}>
            <label className="field">
              <span>Equipment</span>
              <select
                value={issueForm.equipmentId}
                onChange={(event) => setIssueForm((current) => ({ ...current, equipmentId: event.target.value }))}
                required
                disabled={editingIssueId !== null}
              >
                <option value="">Select equipment</option>
                {equipment.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.asset_tag} / {item.equipment_name}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Issue title</span>
              <input
                value={issueForm.issueTitle}
                onChange={(event) => setIssueForm((current) => ({ ...current, issueTitle: event.target.value }))}
                required
              />
            </label>
            <label className="field">
              <span>Description</span>
              <textarea
                value={issueForm.issueDescription}
                onChange={(event) => setIssueForm((current) => ({ ...current, issueDescription: event.target.value }))}
              />
            </label>
            <label className="field">
              <span>Priority</span>
              <select
                value={issueForm.priority}
                onChange={(event) => setIssueForm((current) => ({ ...current, priority: event.target.value }))}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </label>
            <label className="field">
              <span>Status</span>
              <select
                value={issueForm.issueStatus}
                onChange={(event) => setIssueForm((current) => ({ ...current, issueStatus: event.target.value }))}
              >
                <option value="open">Open</option>
                <option value="in_progress">In progress</option>
                <option value="resolved">Resolved</option>
                <option value="closed">Closed</option>
              </select>
            </label>
            <div className="card-action-row">
              <button className="primary-btn compact-btn" type="submit">
                {editingIssueId ? "Update issue" : "Create issue"}
              </button>
              {editingIssueId ? (
                <button
                  className="secondary-btn compact-btn"
                  type="button"
                  onClick={() => {
                    setEditingIssueId(null);
                    setIssueForm({
                      equipmentId: "",
                      issueTitle: "",
                      issueDescription: "",
                      priority: "medium",
                      issueStatus: "open",
                    });
                  }}
                >
                  Cancel edit
                </button>
              ) : null}
            </div>
          </form>
          <div className="mini-list">
            {issues.map((issue) => (
              <article className="mini-list-card action-card" key={issue.id}>
                <strong>{issue.issue_title}</strong>
                <span>
                  <span className={`status-pill status-${issue.issue_status}`}>{issue.issue_status}</span>
                  {" "}
                  {issue.asset_tag} / {issue.priority}
                </span>
                <span>{issue.issue_description || "No issue description."}</span>
                <div className="card-action-row">
                  <button className="secondary-btn compact-btn" type="button" onClick={() => handleEditIssue(issue)}>
                    Edit
                  </button>
                  <button className="secondary-btn compact-btn btn-soft-danger" type="button" onClick={() => void handleDeleteIssue(issue.id)}>
                    Delete
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>
      );
    }

    if (roleView === "it-support") {
      const availableStockPageKey = "stock-available-items";
      const availableStockPageSize = pageSizeByKey[availableStockPageKey] || DEFAULT_ITEMS_PER_PAGE;
      const availableStockTotalPages = Math.max(Math.ceil(localAvailableEquipment.length / availableStockPageSize), 1);
      const availableStockCurrentPage = Math.min(requestPageByKey[availableStockPageKey] || 1, availableStockTotalPages);
      const paginatedAvailableStock = paginateRows(localAvailableEquipment, availableStockCurrentPage, availableStockPageSize);

      const returnedStockPageKey = "stock-returned-items";
      const returnedStockPageSize = pageSizeByKey[returnedStockPageKey] || DEFAULT_ITEMS_PER_PAGE;
      const returnedStockTotalPages = Math.max(Math.ceil(returnedHoldingAssignments.length / returnedStockPageSize), 1);
      const returnedStockCurrentPage = Math.min(requestPageByKey[returnedStockPageKey] || 1, returnedStockTotalPages);
      const paginatedReturnedStock = paginateRows(returnedHoldingAssignments, returnedStockCurrentPage, returnedStockPageSize);

      const disposedStockPageKey = "stock-disposed-items";
      const disposedStockPageSize = pageSizeByKey[disposedStockPageKey] || DEFAULT_ITEMS_PER_PAGE;
      const disposedStockTotalPages = Math.max(Math.ceil(disposedEquipment.length / disposedStockPageSize), 1);
      const disposedStockCurrentPage = Math.min(requestPageByKey[disposedStockPageKey] || 1, disposedStockTotalPages);
      const paginatedDisposedStock = paginateRows(disposedEquipment, disposedStockCurrentPage, disposedStockPageSize);

      const branchStockItems = equipment.filter((item) => !user.branchId || item.branch_id === user.branchId);
      const addedItemsPageKey = "stock-added-items";
      const addedItemsPageSize = pageSizeByKey[addedItemsPageKey] || DEFAULT_ITEMS_PER_PAGE;
      const addedItemsTotalPages = Math.max(Math.ceil(branchStockItems.length / addedItemsPageSize), 1);
      const addedItemsCurrentPage = Math.min(requestPageByKey[addedItemsPageKey] || 1, addedItemsTotalPages);
      const paginatedBranchStockItems = paginateRows(branchStockItems, addedItemsCurrentPage, addedItemsPageSize);

      return (
        <section className="dashboard-panel">
          <div className="panel-header">
            <div>
              <h3>Stock Control</h3>
            </div>
            <div className="panel-header-actions">
              {isStockFormOpen ? (
                <button className="secondary-btn compact-btn" type="button" onClick={resetStockForm}>
                  Close stock form
                </button>
              ) : (
                <button className="primary-btn compact-btn" type="button" onClick={() => setIsStockFormOpen(true)}>
                  Register new asset
                </button>
              )}
            </div>
          </div>
          {isStockFormOpen ? (
            <div className="toggle-form-panel">
              <form className="simple-form stock-crud-form" onSubmit={handleSubmitEquipment}>
                <label className="field">
                  <span>Asset tag</span>
                  <input
                    value={stockForm.assetTag}
                    onChange={(event) => setStockForm((current) => ({ ...current, assetTag: event.target.value }))}
                    required
                  />
                </label>
                <label className="field">
                  <span>Serial number</span>
                  <input
                    value={stockForm.serialNumber}
                    onChange={(event) => setStockForm((current) => ({ ...current, serialNumber: event.target.value }))}
                    required
                  />
                </label>
                <label className="field">
                  <span>Computer name / Hostname</span>
                  <input
                    value={stockForm.computerName}
                    onChange={(event) => setStockForm((current) => ({ ...current, computerName: event.target.value }))}
                    placeholder="Example: KGL-LT-0142 or DESKTOP-0142"
                  />
                </label>
                <label className="field">
                  <span>Category</span>
                  <select
                    value={stockForm.categoryId}
                    onChange={(event) => {
                      const nextCategory = categories.find((category) => String(category.id) === event.target.value);
                      const isStorageDeviceCategory = nextCategory
                        ? storageDeviceCategoryNames.has(nextCategory.name.toLowerCase())
                        : false;
                      const nextAccessories = getRequiredAccessoriesForCategory(nextCategory?.name);

                      setStockForm((current) => ({
                        ...current,
                        categoryId: event.target.value,
                        equipmentName: nextCategory?.name || "",
                        ram: isStorageDeviceCategory ? current.ram : "",
                        cpu: isStorageDeviceCategory ? current.cpu : "",
                        storageCapacity: isStorageDeviceCategory ? current.storageCapacity : "",
                        storageType: isStorageDeviceCategory ? current.storageType : "SSD",
                        osVersion: isStorageDeviceCategory ? current.osVersion : "",
                        includedAccessories: nextAccessories,
                        accessoryNotes: nextAccessories.length > 0 ? current.accessoryNotes : "",
                      }));
                    }}
                    required
                  >
                    <option value="">Select category</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </label>
                {!editingEquipmentId ? (
                  <div className="field field-span-2 inline-create-panel">
                    <span>Category not listed?</span>
                    <div className="inline-create-grid">
                      <input
                        value={newStockCategoryName}
                        onChange={(event) => setNewStockCategoryName(event.target.value)}
                        placeholder="New category name, e.g. Projector"
                      />
                      <button className="secondary-btn compact-btn" type="button" onClick={() => void handleCreateStockCategory()}>
                        Add category
                      </button>
                    </div>
                  </div>
                ) : null}
                <label className="field">
                  <span>Vendor</span>
                  <input
                    value={stockForm.vendorName}
                    onChange={(event) => setStockForm((current) => ({ ...current, vendorName: event.target.value }))}
                    placeholder="Example: Dell"
                  />
                </label>
                <label className="field">
                  <span>Model</span>
                  <input
                    value={stockForm.modelName}
                    onChange={(event) => setStockForm((current) => ({ ...current, modelName: event.target.value }))}
                    placeholder="Example: Latitude 5440"
                  />
                </label>
                {isStorageDeviceStockForm ? (
                  <>
                    <label className="field">
                      <span>CPU</span>
                      <input
                        value={stockForm.cpu}
                        onChange={(event) => setStockForm((current) => ({ ...current, cpu: event.target.value }))}
                        placeholder="Example: Intel Core i5"
                      />
                    </label>
                    <label className="field">
                      <span>RAM</span>
                      <input
                        value={stockForm.ram}
                        onChange={(event) => setStockForm((current) => ({ ...current, ram: event.target.value }))}
                        placeholder={selectedStockCategory?.name.toLowerCase() === "smartphone" ? "Example: 8GB" : "Example: 16GB DDR4"}
                        required
                      />
                    </label>
                    <label className="field">
                      <span>Storage capacity</span>
                      <input
                        value={stockForm.storageCapacity}
                        onChange={(event) => setStockForm((current) => ({ ...current, storageCapacity: event.target.value }))}
                        placeholder={selectedStockCategory?.name.toLowerCase() === "smartphone" ? "Example: 128GB" : "Example: 512GB"}
                        required
                      />
                    </label>
                    <label className="field">
                      <span>HDD/SSD</span>
                      <select
                        value={stockForm.storageType}
                        onChange={(event) => setStockForm((current) => ({ ...current, storageType: event.target.value }))}
                      >
                        <option value="SSD">SSD</option>
                        <option value="HDD">HDD</option>
                        <option value="eMMC">eMMC</option>
                        <option value="Flash">Flash</option>
                      </select>
                    </label>
                    <label className="field">
                      <span>OS version</span>
                      <input
                        value={stockForm.osVersion}
                        onChange={(event) => setStockForm((current) => ({ ...current, osVersion: event.target.value }))}
                        placeholder="Example: Windows 11 Pro 23H2"
                      />
                    </label>
                  </>
                ) : null}
                {hasRequiredAccessoryChecklist ? (
                  <div className="field field-span-2">
                    <span>Required accessories</span>
                    <div className="accessory-checklist">
                      {requiredStockAccessories.map((accessory) => {
                        const isChecked = stockForm.includedAccessories.includes(accessory);
                        return (
                          <label className="checkbox-field" key={accessory}>
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(event) =>
                                setStockForm((current) => ({
                                  ...current,
                                  includedAccessories: event.target.checked
                                    ? Array.from(new Set([...current.includedAccessories, accessory]))
                                    : current.includedAccessories.filter((item) => item !== accessory),
                                }))
                              }
                            />
                            <span>{accessory}</span>
                          </label>
                        );
                      })}
                    </div>
                    <small className="field-hint">
                      {selectedStockCategory?.name === "desktop"
                        ? "Desktop handover must include the full setup."
                        : "Laptop handover must include the bag."}
                    </small>
                  </div>
                ) : null}
                <label className="field field-span-2">
                  <span>Accessory notes</span>
                  <textarea
                    value={stockForm.accessoryNotes}
                    onChange={(event) => setStockForm((current) => ({ ...current, accessoryNotes: event.target.value }))}
                    rows={2}
                    placeholder="Optional: charger size, monitor type, mouse model, or other issued items"
                  />
                </label>
                <label className="field">
                  <span>Status</span>
                  <select
                    value={stockForm.status}
                    onChange={(event) => setStockForm((current) => ({ ...current, status: event.target.value }))}
                  >
                    <option value="available">Available</option>
                    <option value="assigned">Assigned</option>
                    <option value="maintenance">Maintenance</option>
                    <option value="retired">Retired</option>
                    <option value="lost">Lost</option>
                  </select>
                  <small className="field-hint">
                    Items marked as available will appear in the Available stock table after registration.
                  </small>
                </label>
                <label className="field">
                  <span>Device health</span>
                  <select
                    value={stockForm.deviceHealth}
                    onChange={(event) => setStockForm((current) => ({ ...current, deviceHealth: event.target.value }))}
                  >
                    <option value="Healthy">Healthy</option>
                    <option value="Needs attention">Needs attention</option>
                    <option value="Damaged">Damaged</option>
                    <option value="Faulty">Faulty</option>
                    <option value="Refurbished">Refurbished</option>
                  </select>
                </label>
                <label className="field">
                  <span>Purchase year</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={4}
                    value={stockForm.purchaseYear}
                    onChange={(event) =>
                      setStockForm((current) => ({
                        ...current,
                        purchaseYear: event.target.value.replace(/\D/g, "").slice(0, 4),
                      }))
                    }
                    placeholder="Example: 2026"
                  />
                </label>
                <label className="field">
                  <span>Purchase cost</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={stockForm.purchaseCost}
                    onChange={(event) => setStockForm((current) => ({ ...current, purchaseCost: event.target.value }))}
                  />
                </label>
                <label className="field">
                  <span>Purchase date</span>
                  <input
                    type="date"
                    value={stockForm.purchaseDate}
                    onChange={(event) => setStockForm((current) => ({ ...current, purchaseDate: event.target.value }))}
                  />
                </label>
                <label className="field">
                  <span>Location</span>
                  <input
                    value={stockForm.locationDetails}
                    onChange={(event) => setStockForm((current) => ({ ...current, locationDetails: event.target.value }))}
                    placeholder="Example: Kigali HQ, Level 4, IT store"
                  />
                </label>
                <label className="field">
                  <span>Warranty end</span>
                  <input
                    type="date"
                    value={stockForm.warrantyEndDate}
                    onChange={(event) => setStockForm((current) => ({ ...current, warrantyEndDate: event.target.value }))}
                  />
                </label>
                <label className="field">
                  <span>Lifespan in Airtel</span>
                  <input
                    type="number"
                    min="1"
                    value={stockForm.lifespanYears}
                    onChange={(event) => setStockForm((current) => ({ ...current, lifespanYears: event.target.value }))}
                    required
                  />
                </label>
                <article className="mini-list-card stock-lifespan-summary">
                  <strong>Expected lifespan</strong>
                  <span>{stockForm.lifespanYears || "4"} years in Airtel</span>
                  <span>
                    Replacement target: {getReplacementDate(stockForm.purchaseDate || null, Number(stockForm.lifespanYears || 4), Number(stockForm.purchaseYear || 0) || null)}
                  </span>
                </article>
                <div className="stock-form-footer field-span-2">
                  <div className="card-action-row">
                    <button className="primary-btn compact-btn" type="submit">
                      {editingEquipmentId ? "Save changes" : "Register"}
                    </button>
                    <button className="secondary-btn compact-btn" type="button" onClick={resetStockForm}>
                      Cancel
                    </button>
                  </div>
                </div>
              </form>
            </div>
          ) : null}
          <div className="stock-control-filter-bar">
            <div className="filter-chip-row">
              {([
                { key: "available", label: "Available", total: localAvailableEquipment.length },
                { key: "returned", label: "Returned", total: returnedHoldingAssignments.length },
                { key: "retired", label: "Retired", total: disposedEquipment.length },
              ] as Array<{ key: StockControlView; label: string; total: number }>).map((option) => (
                <button
                  key={option.key}
                  type="button"
                  className={`filter-chip${stockControlView === option.key ? " is-active" : ""}`}
                  onClick={() => setStockControlView(option.key)}
                >
                  {option.label} ({option.total})
                </button>
              ))}
            </div>
          </div>
          {stockControlView === "available" ? (
            <article className="inventory-focus-card">
              <div className="panel-header">
                <h3>
                  <PackageCheck size={18} strokeWidth={2.2} />
                  <span>Available</span>
                </h3>
                <span>{localAvailableEquipment.length}</span>
              </div>
              <p className="dashboard-subtitle">Ready for assignment.</p>
              <div className="user-table workflow-stock-table workflow-stock-table-compact">
                <div className="user-table-head workflow-stock-table-head">
                  <span>Asset</span>
                  <span>Status / Type</span>
                  <span>Location</span>
                  <span>Cost / Warranty</span>
                  <span>Depreciation</span>
                  <span>Lifespan / Replace By</span>
                  <span>Notes</span>
                  <span>Actions</span>
                </div>
                {localAvailableEquipment.length > 0 ? (
                  paginatedAvailableStock.map((item) => (
                    <div className="user-table-row workflow-stock-table-row" key={`available-${item.id}`}>
                      <div className="user-primary-cell">
                        <strong>{item.asset_tag}</strong>
                        <span>{item.serial_number}</span>
                      </div>
                      <div className="user-secondary-cell">
                        <strong>{item.equipment_name}</strong>
                        <span>
                          <span className={`status-pill status-${item.status}`}>{item.status}</span>
                        </span>
                      </div>
                      <div className="user-secondary-cell">
                        <strong>{item.category_name || "No category"}</strong>
                        <span>{item.branch_name || "No branch"}</span>
                      </div>
                      <div className="user-secondary-cell">
                        <strong>{item.purchase_cost ? Number(item.purchase_cost).toLocaleString() : "0"}</strong>
                        <span>Warranty: {item.warranty_end_date ? item.warranty_end_date.slice(0, 10) : "Not set"}</span>
                      </div>
                      <div className="user-secondary-cell">
                        <strong>{getEquipmentDepreciationSummary(item)}</strong>
                        <span>{getEquipmentDepreciationDetail(item)}</span>
                      </div>
                      <div className="user-secondary-cell">
                        <strong>{item.lifespan_years ?? 4} years</strong>
                        <span>{getReplacementDate(item.purchase_date, item.lifespan_years, item.purchase_year)}</span>
                      </div>
                      <div className="user-secondary-cell">
                        <strong>{getReplacementStockLabel(item) || "Ready for assignment"}</strong>
                        <span>{item.replacement_condition_status || item.location_details || "No note"}</span>
                      </div>
                      <div className="table-action-group workflow-stock-table-actions">
                        <button className="table-action" type="button" onClick={() => void openDetailPanel("equipment", item.id)}>
                          View details
                        </button>
                        <button className="table-action" type="button" onClick={() => void handlePreviewEquipmentQr(item)}>
                          QR code
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="loading-text">No available devices.</p>
                )}
              </div>
              {renderPaginationBar(availableStockPageKey, localAvailableEquipment.length, availableStockCurrentPage, availableStockPageSize, (page) =>
                setRequestPageByKey((current) => ({
                  ...current,
                  [availableStockPageKey]: page,
                }))
              )}
            </article>
          ) : null}
          {stockControlView === "returned" ? (
            <article className="inventory-focus-card">
              <div className="panel-header">
                <h3>
                  <RotateCcw size={18} strokeWidth={2.2} />
                  <span>Returned</span>
                </h3>
                <span>{returnedHoldingAssignments.length}</span>
              </div>
              <p className="dashboard-subtitle">Waiting decision.</p>
              <div className="user-table workflow-assignment-table workflow-stock-table-compact">
                <div className="user-table-head workflow-assignment-table-head">
                  <span>Asset</span>
                  <span>Status / Employee</span>
                  <span>Specs / Category</span>
                  <span>Assigned / Return</span>
                  <span>Depreciation</span>
                  <span>Replacement</span>
                  <span>Actions</span>
                </div>
                {returnedHoldingAssignments.length > 0 ? (
                  paginatedReturnedStock.map(({ assignment, equipment: item }) =>
                    item ? (
                      <div className="user-table-row workflow-assignment-table-row" key={`returned-${assignment.id}`}>
                        <div className="user-primary-cell">
                          <strong>{item.asset_tag}</strong>
                          <span>{item.serial_number}</span>
                        </div>
                        <div className="user-secondary-cell">
                          <strong>{item.equipment_name}</strong>
                          <span>{assignment.employee_name || "No employee"}</span>
                        </div>
                        <div className="user-secondary-cell">
                          <strong>{item.category_name || "No category"}</strong>
                          <span>{formatAssignmentEquipmentSpecs(assignment) || "No specs"}</span>
                        </div>
                        <div className="user-secondary-cell">
                          <strong>{formatProfileDate(assignment.assigned_at)}</strong>
                          <span>Return: {formatProfileDate(assignment.expected_return_date)}</span>
                        </div>
                        <div className="user-secondary-cell">
                          <strong>{getAssignmentDepreciationSummary(assignment)}</strong>
                          <span>{getAssignmentDepreciationDetail(assignment)}</span>
                        </div>
                        <div className="user-secondary-cell">
                          <strong>{getReplacementAssignmentLabel(assignment) || "Awaiting decision"}</strong>
                          <span>{assignment.replacement_condition_status || "No replacement note"}</span>
                        </div>
                        <div className="table-action-group workflow-stock-table-actions">
                          <button className="table-action" type="button" onClick={() => void openDetailPanel("assignment", assignment.id)}>
                            View details
                          </button>
                          <button className="table-action" type="button" onClick={() => void handlePreviewEquipmentQr(item)}>
                            QR code
                          </button>
                        </div>
                      </div>
                    ) : null,
                  )
                ) : (
                  <p className="loading-text">No returned devices.</p>
                )}
              </div>
              {renderPaginationBar(returnedStockPageKey, returnedHoldingAssignments.length, returnedStockCurrentPage, returnedStockPageSize, (page) =>
                setRequestPageByKey((current) => ({
                  ...current,
                  [returnedStockPageKey]: page,
                }))
              )}
            </article>
          ) : null}
          {stockControlView === "retired" ? (
            <article className="inventory-focus-card">
              <div className="panel-header">
                <h3>
                  <TriangleAlert size={18} strokeWidth={2.2} />
                  <span>Retired</span>
                </h3>
                <span>{disposedEquipment.length}</span>
              </div>
              <p className="dashboard-subtitle">Wasted, lost, or retired.</p>
              <div className="user-table workflow-stock-table workflow-stock-table-compact">
                <div className="user-table-head workflow-stock-table-head">
                  <span>Asset</span>
                  <span>Status / Type</span>
                  <span>Location</span>
                  <span>Cost / Warranty</span>
                  <span>Depreciation</span>
                  <span>Lifespan / Replace By</span>
                  <span>Notes</span>
                  <span>Actions</span>
                </div>
                {disposedEquipment.length > 0 ? (
                  paginatedDisposedStock.map((item) => (
                    <div className="user-table-row workflow-stock-table-row" key={`disposed-${item.id}`}>
                      <div className="user-primary-cell">
                        <strong>{item.asset_tag}</strong>
                        <span>{item.serial_number}</span>
                      </div>
                      <div className="user-secondary-cell">
                        <strong>{item.equipment_name}</strong>
                        <span>
                          <span className={`status-pill status-${item.status}`}>{item.status}</span>
                        </span>
                      </div>
                      <div className="user-secondary-cell">
                        <strong>{item.category_name || "No category"}</strong>
                        <span>{item.branch_name || "No branch"}</span>
                      </div>
                      <div className="user-secondary-cell">
                        <strong>{item.purchase_cost ? Number(item.purchase_cost).toLocaleString() : "0"}</strong>
                        <span>Warranty: {item.warranty_end_date ? item.warranty_end_date.slice(0, 10) : "Not set"}</span>
                      </div>
                      <div className="user-secondary-cell">
                        <strong>{getEquipmentDepreciationSummary(item)}</strong>
                        <span>{getEquipmentDepreciationDetail(item)}</span>
                      </div>
                      <div className="user-secondary-cell">
                        <strong>{item.lifespan_years ?? 4} years</strong>
                        <span>{getReplacementDate(item.purchase_date, item.lifespan_years, item.purchase_year)}</span>
                      </div>
                      <div className="user-secondary-cell">
                        <strong>{getReplacementStockLabel(item) || "Retired record"}</strong>
                        <span>{item.replacement_condition_status || "No retirement note"}</span>
                      </div>
                      <div className="table-action-group workflow-stock-table-actions">
                        <button className="table-action" type="button" onClick={() => void openDetailPanel("equipment", item.id)}>
                          View details
                        </button>
                        <button className="table-action" type="button" onClick={() => void handlePreviewEquipmentQr(item)}>
                          QR code
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="loading-text">No retired items.</p>
                )}
              </div>
              {renderPaginationBar(disposedStockPageKey, disposedEquipment.length, disposedStockCurrentPage, disposedStockPageSize, (page) =>
                setRequestPageByKey((current) => ({
                  ...current,
                  [disposedStockPageKey]: page,
                }))
              )}
            </article>
          ) : null}
          <div className="subpanel-header">
            <h4>Added Items</h4>
            <button
              className="secondary-btn compact-btn"
              type="button"
              onClick={() => setIsStockListOpen((current) => !current)}
            >
              {isStockListOpen ? "Hide items" : "Show items"}
            </button>
          </div>
          {isStockListOpen ? (
            <>
            <div className="user-table workflow-stock-table">
              <div className="user-table-head workflow-stock-table-head">
                <span>Asset</span>
                <span>Status / Type</span>
                <span>Location</span>
                <span>Cost / Warranty</span>
                <span>Depreciation</span>
                <span>Lifespan / Replace By</span>
                <span>Notes</span>
                <span>Actions</span>
              </div>
              {paginatedBranchStockItems.map((item) => (
                <div className="user-table-row workflow-stock-table-row" key={item.id}>
                  <div className="user-primary-cell">
                    <strong>{item.asset_tag}</strong>
                    <span>{item.serial_number}</span>
                  </div>
                  <div className="user-secondary-cell">
                    <strong>{item.equipment_name}</strong>
                    <span>
                      <span className={`status-pill status-${item.status}`}>{item.status}</span>
                    </span>
                  </div>
                  <div className="user-secondary-cell">
                    <strong>{item.category_name || "No category"}</strong>
                    <span>{item.branch_name || "No branch"}</span>
                  </div>
                  <div className="user-secondary-cell">
                    <strong>{item.purchase_cost ? Number(item.purchase_cost).toLocaleString() : "0"}</strong>
                    <span>Warranty: {item.warranty_end_date ? item.warranty_end_date.slice(0, 10) : "Not set"}</span>
                  </div>
                  <div className="user-secondary-cell">
                    <strong>{getEquipmentDepreciationSummary(item)}</strong>
                    <span>{getEquipmentDepreciationDetail(item)}</span>
                  </div>
                  <div className="user-secondary-cell">
                    <strong>{item.lifespan_years ?? 4} years</strong>
                    <span>{getReplacementDate(item.purchase_date, item.lifespan_years, item.purchase_year)}</span>
                  </div>
                  <div className="user-secondary-cell">
                    <strong>{getReplacementStockLabel(item) || "No replacement note"}</strong>
                    <span>{item.replacement_condition_status || "No condition note"}</span>
                  </div>
                  <div className="table-action-group workflow-stock-table-actions">
                    <button className="table-action" type="button" onClick={() => void openDetailPanel("equipment", item.id)}>
                      View details
                    </button>
                    <button className="table-action" type="button" onClick={() => void handlePreviewEquipmentQr(item)}>
                      QR code
                    </button>
                    <button className="table-action" type="button" onClick={() => handleEditEquipment(item)}>
                      Edit
                    </button>
                    <button className="table-action table-action-danger" type="button" onClick={() => void handleDeleteEquipment(item.id)}>
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
            {renderPaginationBar(addedItemsPageKey, branchStockItems.length, addedItemsCurrentPage, addedItemsPageSize, (page) =>
              setRequestPageByKey((current) => ({
                ...current,
                [addedItemsPageKey]: page,
              }))
            )}
            </>
          ) : null}
          <div className="qr-panel dashboard-qr-panel" id="equipment-qr-panel">
            <div className="panel-header">
              <h3>Equipment QR</h3>
            </div>
            {isEquipmentQrLoading ? (
              <p className="loading-text">Generating item QR code...</p>
            ) : equipmentQrError ? (
              <p className="error-text">{equipmentQrError}</p>
            ) : selectedQrEquipment && equipmentQrImageUrl ? (
              <div className="qr-card stacked-qr-card">
                <div className="qr-preview">
                  <img src={equipmentQrImageUrl} alt={`${selectedQrEquipment.asset_tag} QR code`} />
                </div>
                <div className="qr-details">
                  <p>
                    <strong>Asset tag:</strong> {selectedQrEquipment.asset_tag}
                  </p>
                  <p>
                    <strong>Serial number:</strong> {selectedQrEquipment.serial_number}
                  </p>
                  <p>
                    <strong>Equipment:</strong> {selectedQrEquipment.equipment_name}
                  </p>
                  <p>
                    <strong>Category:</strong> {selectedQrEquipment.category_name || "Not set"}
                  </p>
                  <p>
                    <strong>Location:</strong> {selectedQrEquipment.branch_name || "No branch"}
                  </p>
                  <p>
                    <strong>Purchase date:</strong> {formatQrDate(selectedQrEquipment.purchase_date)}
                  </p>
                  <p>
                    <strong>Purchase cost:</strong> {Number(selectedQrEquipment.purchase_cost ?? 0).toLocaleString()}
                  </p>
                  <p>
                    <strong>Annual depreciation:</strong> {getEquipmentDepreciationSummary(selectedQrEquipment)}
                  </p>
                  <p>
                    <strong>Depreciation detail:</strong> {getEquipmentDepreciationDetail(selectedQrEquipment)}
                  </p>
                  <p>
                    <strong>Warranty end:</strong> {formatQrDate(selectedQrEquipment.warranty_end_date)}
                  </p>
                  <button className="primary-btn qr-download-btn" type="button" onClick={handleDownloadEquipmentQr}>
                    Download QR
                  </button>
                </div>
              </div>
            ) : (
              <p className="loading-text">Create an item or select QR code on any stock card to preview its full equipment QR.</p>
            )}
          </div>
        </section>
      );
    }

    return (
      <section className="dashboard-panel">
        <div className="panel-header">
          <h3>My Requests</h3>
          <div className="panel-header-actions">
            <input
              className="table-search-input"
              type="search"
              value={requestSearchTerm}
              onChange={(event) => setRequestSearchTerm(event.target.value)}
              placeholder="Search device type e.g. laptop"
              aria-label="Search requests by device type"
            />
          </div>
        </div>
        {renderRequestCards(filteredEmployeeRequests, "view")}
      </section>
    );
  };

  const renderReportsSection = () => {
    const reportCards = [
      ...(roleView === "employee" ? employeeStatusCounts : dashboardData?.reports.requestStatus ?? []).map((item) => ({
        key: `request-${item.label}`,
        label: item.label,
        total: item.total,
        kind: "request" as const,
        status: item.label,
      })),
      ...(roleView === "it-manager"
        ? (dashboardData?.reports.equipmentStatus ?? []).map((item) => ({
            key: `equipment-${item.label}`,
            label: `${item.label} equipment`,
            total: item.total,
            kind: "equipment" as const,
            status: item.label,
          }))
        : []),
      ...(roleView === "it-support"
        ? (dashboardData?.reports.assignmentStatus ?? []).map((item) => ({
            key: `assignment-${item.label}`,
            label: `${item.label} assignments`,
            total: item.total,
            kind: "assignment" as const,
            status: item.label,
          }))
        : []),
    ];

    const activeReport =
      reportCards.find((item) => item.key === selectedReportKey) ??
      reportCards[0] ??
      null;

    const renderReportDetails = () => {
      if (!activeReport) {
        return <p className="loading-text">No report data is available right now.</p>;
      }

      if (activeReport.kind === "request") {
        return renderRequestCards(getRequestsForReportStatus(activeReport.status), "view");
      }

      if (activeReport.kind === "equipment") {
        const matchingEquipment = getEquipmentForReportStatus(activeReport.status);

        return matchingEquipment.length > 0 ? (
          <div className="report-list">
            {matchingEquipment.map((item) => (
              <article className="report-list-card" key={`report-equipment-${item.id}`}>
                <div className="report-list-head">
                  <strong>{item.asset_tag}</strong>
                  <span className={`status-pill status-${item.status}`}>{item.status}</span>
                </div>
                <p>{item.equipment_name}</p>
                <span>{item.category_name || "No category"} / {item.branch_name || "No branch"}</span>
                {formatEquipmentSpecs(item) ? <span>{formatEquipmentSpecs(item)}</span> : null}
              </article>
            ))}
          </div>
        ) : (
          <p className="loading-text">No equipment matches this report right now.</p>
        );
      }

      const matchingAssignments = getAssignmentsForReportStatus(activeReport.status);

      return matchingAssignments.length > 0 ? (
        <div className="report-list">
          {matchingAssignments.map((assignment) => (
            <article className="report-list-card" key={`report-assignment-${assignment.id}`}>
              <div className="report-list-head">
                <strong>{assignment.employee_name}</strong>
                <span className={`status-pill status-${assignment.status}`}>{assignment.status}</span>
              </div>
              <p>{assignment.asset_tag} / {assignment.equipment_name}</p>
              <span>{assignment.employee_email || "No email"} / {assignment.branch_name || "No branch"}</span>
              <span>Assigned: {formatProfileDate(assignment.assigned_at)} / Return: {formatProfileDate(assignment.expected_return_date)}</span>
            </article>
          ))}
        </div>
      ) : (
        <p className="loading-text">No assignments match this report right now.</p>
      );
    };

    return (
      <section className="dashboard-panel">
        <div className="panel-header">
          <h3>Reports</h3>
          <button className="panel-link-button export-button" type="button" onClick={handleExportReports}>
            <Download size={16} />
            <span>Export Document</span>
          </button>
        </div>
        <div className="report-summary-grid">
          {reportCards.map((item) => (
            <button
              key={item.key}
              className={`report-card report-card-button${activeReport?.key === item.key ? " is-active" : ""}`}
              type="button"
              onClick={() => setSelectedReportKey(item.key)}
            >
              <strong>{item.total}</strong>
              <p>{item.label}</p>
              <span className="metric-card-action">Open details</span>
            </button>
          ))}
        </div>
        <div className="report-bottom-grid">
          <section className="report-panel">
            <div className="panel-header">
              <h3>{activeReport ? `${activeReport.label} details` : "Report details"}</h3>
            </div>
            {renderReportDetails()}
          </section>
        </div>
      </section>
    );
  };

  const renderTimelineSection = () => (
    <>
      <section className="dashboard-panel">
        <div className="panel-header">
          <h3>Request Timeline</h3>
          <button className="panel-link-button export-button" type="button" onClick={handleExportTimeline}>
            <Download size={16} />
            <span>Export Document</span>
          </button>
        </div>
        <div className="filter-chip-row">
          {(["all", "pending", "approved", "rejected", "fulfilled"] as TimelineFilter[]).map((filter) => (
            <button
              key={filter}
              type="button"
              className={`filter-chip${timelineFilter === filter ? " is-active" : ""}`}
              onClick={() => setTimelineFilter(filter)}
            >
              {filter}
            </button>
          ))}
        </div>
        {renderRequestCards(timelineRequests, "view")}
      </section>
      {roleView === "employee" ? null : renderLifecyclePanel()}
    </>
  );

  const renderMyEquipmentSection = () => (
    <section className="dashboard-panel">
      <div className="panel-header">
        <h3>My Equipment</h3>
      </div>
      <div className="user-table workflow-assignment-table">
        <div className="user-table-head workflow-assignment-table-head">
          <span>Asset</span>
          <span>Status / Receipt</span>
          <span>Type / Specs</span>
          <span>Depreciation</span>
          <span>Vendor / Warranty</span>
          <span>Notes</span>
          <span>Actions</span>
        </div>
        {employeeAssignments.length > 0 ? (
          employeeAssignments.map((assignment) => (
            <div className="user-table-row workflow-assignment-table-row" key={assignment.id}>
              <div className="user-primary-cell">
                <strong>{assignment.asset_tag}</strong>
                <span>{assignment.serial_number}</span>
              </div>
              <div className="user-secondary-cell">
                <strong>{assignment.equipment_name}</strong>
                <span>{getAssignmentStatusLabel(assignment)}</span>
                <span className={`status-pill status-${assignment.status === "returned" && isReplacementAssignment(assignment) ? "fulfilled" : assignment.receipt_status}`}>
                  {getAssignmentReceiptLabel(assignment)}
                </span>
              </div>
              <div className="user-secondary-cell">
                <strong>{assignment.category_name || "No category"}</strong>
                <span>{formatAssignmentEquipmentSpecs(assignment) || "No specs"}</span>
              </div>
              <div className="user-secondary-cell">
                <strong>{getAssignmentDepreciationSummary(assignment)}</strong>
                <span>{getAssignmentDepreciationDetail(assignment)}</span>
              </div>
              <div className="user-secondary-cell">
                <strong>{assignment.vendor_name || "No vendor"} / {assignment.model_name || "No model"}</strong>
                <span>Warranty: {formatProfileDate(assignment.warranty_end_date)}</span>
              </div>
              <div className="user-secondary-cell">
                <strong>{getReplacementAssignmentLabel(assignment) || currentUser.officeLocation || "No office location"}</strong>
                <span>{assignment.replacement_condition_status || currentUser.jobTitle || "No job title"}</span>
                {assignment.status === "returned" && isReplacementAssignment(assignment) ? (
                  <span>Replaced on: {formatProfileDate(assignment.replacement_processed_at || assignment.assigned_at)}</span>
                ) : assignment.received_confirmed_at ? (
                  <span>Received confirmed: {formatProfileDate(assignment.received_confirmed_at)}</span>
                ) : null}
              </div>
              <div className="table-action-group workflow-stock-table-actions">
                <button className="table-action" type="button" onClick={() => void openDetailPanel("assignment", assignment.id)}>
                  View details
                </button>
                <button className="table-action" type="button" onClick={() => void handlePreviewEquipmentQr(buildEquipmentRowFromAssignment(assignment), "my-equipment")}>
                  QR code
                </button>
                {assignment.status === "returned" && isReplacementAssignment(assignment) ? null : assignment.received_confirmed_at ? null : (
                  <div className="card-form-stack workflow-inline-form">
                  <textarea
                    value={receiptNotes[assignment.id] || ""}
                    onChange={(event) =>
                      setReceiptNotes((current) => ({
                        ...current,
                        [assignment.id]: event.target.value,
                      }))
                    }
                    placeholder="Optional receipt note, condition, or handover comment"
                  />
                  <button
                    className="primary-btn compact-btn"
                    type="button"
                    onClick={() => void handleConfirmReceipt(assignment.id)}
                    disabled={assignment.status !== "active"}
                  >
                    Confirm received
                  </button>
                  </div>
                )}
              </div>
            </div>
          ))
        ) : (
          <p className="loading-text">No equipment is assigned to this employee yet.</p>
        )}
      </div>
      <div className="qr-panel dashboard-qr-panel" id="equipment-qr-panel">
        <div className="panel-header">
          <h3>Equipment QR</h3>
        </div>
        {isEquipmentQrLoading ? (
          <p className="loading-text">Generating item QR code...</p>
        ) : equipmentQrError ? (
          <p className="error-text">{equipmentQrError}</p>
        ) : selectedQrEquipment && equipmentQrImageUrl ? (
          <div className="qr-card stacked-qr-card">
            <div className="qr-preview">
              <img src={equipmentQrImageUrl} alt={`${selectedQrEquipment.asset_tag} QR code`} />
            </div>
            <div className="qr-details">
              <p><strong>Asset tag:</strong> {selectedQrEquipment.asset_tag}</p>
              <p><strong>Serial number:</strong> {selectedQrEquipment.serial_number}</p>
              <p><strong>Equipment:</strong> {selectedQrEquipment.equipment_name}</p>
              <p><strong>Specs:</strong> {formatEquipmentSpecs(selectedQrEquipment) || "Not set"}</p>
              <button className="primary-btn qr-download-btn" type="button" onClick={handleDownloadEquipmentQr}>
                Download QR
              </button>
            </div>
          </div>
        ) : (
          <p className="loading-text">Select one of your assigned devices to preview its QR code.</p>
        )}
      </div>
    </section>
  );

  const renderItManagerReturnChecksSection = () => (
    (() => {
      const pageKey = "returns-final-approval";
      const pageSize = pageSizeByKey[pageKey] || DEFAULT_ITEMS_PER_PAGE;
      const totalPages = Math.max(Math.ceil(pendingFinalReturnApprovals.length / pageSize), 1);
      const currentPage = Math.min(returnPageByKey[pageKey] || 1, totalPages);
      const paginatedReturnReviews = paginateRows(pendingFinalReturnApprovals, currentPage, pageSize);

      return (
        <section className="dashboard-panel">
          <div className="panel-header">
            <h3>IT Director Final Return Approvals</h3>
            <span>{pendingFinalReturnApprovals.length} waiting for IT Director</span>
          </div>
          <p className="dashboard-subtitle">
            Review offboarding or returned devices already received by IT Support. Your approval works together with HR Director approval before the device goes back into the current IT store.
          </p>
          <div className="user-table workflow-return-table">
            <div className="user-table-head workflow-return-table-head">
              <span>Asset</span>
              <span>Employee</span>
              <span>Return Details</span>
              <span>Status</span>
              <span>Actions</span>
            </div>
            {pendingFinalReturnApprovals.length > 0 ? (
              paginatedReturnReviews.map((item) => {
            const form = finalReturnApprovalForm[item.id] ?? {
              decision: "approve" as const,
              note: "",
            };
            const isRejecting = form.decision === "reject";

            return (
              <div className="user-table-row workflow-return-table-row" key={item.id}>
                <div className="user-primary-cell">
                  <strong>{item.asset_tag}</strong>
                  <span>{item.equipment_name}</span>
                </div>
                <div className="user-secondary-cell">
                  <strong>{item.employee_name}</strong>
                  <span>{item.employee_email}</span>
                  <span>Requested: {formatProfileDate(item.requested_at)}</span>
                </div>
                <div className="user-secondary-cell">
                  <strong>{formatReturnReason(item.return_reason)}</strong>
                  <span>{item.request_note || "No employee return note added."}</span>
                  <span>IT Support receipt: {item.received_by_name || item.it_manager_name || "Not recorded"} / {formatProfileDate(item.returned_at || item.it_reviewed_at)}</span>
                  <span>{item.received_condition_comment || item.it_review_note || item.intake_note || "No IT Support note recorded."}</span>
                </div>
                <div className="user-secondary-cell">
                  <strong>Condition: {item.condition_status || "Not recorded"}</strong>
                  <span>Recommended stock status: {item.disposition || "Not recorded"}</span>
                  <span>HRD approval: {item.final_hrd_approval_status || "pending"} / ITD approval: {item.final_itd_approval_status || "pending"}</span>
                </div>
                <div className="workflow-table-actions">
                <div className="fulfillment-control-grid">
                  <label className="field">
                    <span>IT Director decision</span>
                    <select
                      value={form.decision}
                      onChange={(event) =>
                        setFinalReturnApprovalForm((current) => ({
                          ...current,
                          [item.id]: {
                            decision: event.target.value as "approve" | "reject",
                            note: form.note,
                          },
                        }))
                      }
                    >
                      <option value="approve">Approve final stock return</option>
                      <option value="reject">Reject final stock return</option>
                    </select>
                  </label>
                </div>
                <label className="field">
                  <span>{isRejecting ? "Rejection reason" : "Approval note"}</span>
                  <textarea
                    value={form.note}
                    onChange={(event) =>
                      setFinalReturnApprovalForm((current) => ({
                        ...current,
                        [item.id]: {
                          ...form,
                          note: event.target.value,
                        },
                      }))
                    }
                    placeholder={
                      isRejecting
                        ? "Explain why IT Director cannot approve this final stock return"
                        : "Optional compliance, stock, or security note"
                    }
                  />
                </label>
                <button
                  className={`primary-btn compact-btn ${isRejecting ? "btn-danger" : "btn-success"}`}
                  type="button"
                  onClick={() => void handleFinalReturnApproval(item.id)}
                >
                  {isRejecting ? "Reject final approval" : "Approve final return"}
                </button>
                </div>
              </div>
            );
              })
            ) : (
              <p className="loading-text">No returns are waiting for IT Director final approval right now.</p>
            )}
          </div>
          {renderPaginationBar(pageKey, pendingFinalReturnApprovals.length, currentPage, pageSize, (page) =>
            setReturnPageByKey((current) => ({
              ...current,
              [pageKey]: page,
            }))
          )}
        </section>
      );
    })()
  );

  const renderStorekeeperReturnsSection = () => {
    const reviewPageKey = "returns-it-support-review";
    const reviewPageSize = pageSizeByKey[reviewPageKey] || DEFAULT_ITEMS_PER_PAGE;
    const reviewTotalPages = Math.max(Math.ceil(pendingItReturnReviews.length / reviewPageSize), 1);
    const reviewCurrentPage = Math.min(returnPageByKey[reviewPageKey] || 1, reviewTotalPages);
    const paginatedReturnReviews = paginateRows(pendingItReturnReviews, reviewCurrentPage, reviewPageSize);

    const intakePageKey = "returns-store-intake";
    const intakePageSize = pageSizeByKey[intakePageKey] || DEFAULT_ITEMS_PER_PAGE;
    const intakeTotalPages = Math.max(Math.ceil(pendingReturnIntake.length / intakePageSize), 1);
    const intakeCurrentPage = Math.min(returnPageByKey[intakePageKey] || 1, intakeTotalPages);
    const paginatedReturnIntake = paginateRows(pendingReturnIntake, intakeCurrentPage, intakePageSize);

    const maintenancePageKey = "returns-maintenance";
    const maintenancePageSize = pageSizeByKey[maintenancePageKey] || DEFAULT_ITEMS_PER_PAGE;
    const maintenanceTotalPages = Math.max(Math.ceil(openMaintenanceRecords.length / maintenancePageSize), 1);
    const maintenanceCurrentPage = Math.min(returnPageByKey[maintenancePageKey] || 1, maintenanceTotalPages);
    const paginatedMaintenanceRecords = paginateRows(openMaintenanceRecords, maintenanceCurrentPage, maintenancePageSize);

    return (
      <>
        <section className="dashboard-panel">
          <div className="panel-header">
            <h3>IT Support Receipt And Assessment</h3>
            <span>{pendingItReturnReviews.length} awaiting receipt</span>
          </div>
          <p className="dashboard-subtitle">
            Receive the device from the employee, assess the health, record accessories and detailed comments, then trigger final approval for offboarding or the next return step.
          </p>
          <div className="user-table workflow-return-table">
            <div className="user-table-head workflow-return-table-head">
              <span>Asset</span>
              <span>Employee</span>
              <span>Return Details</span>
              <span>Status</span>
              <span>Actions</span>
            </div>
            {pendingItReturnReviews.length > 0 ? (
              paginatedReturnReviews.map((item) => {
                const form = itReturnReviewForm[item.id] ?? {
                  conditionStatus: "good",
                  disposition: "available",
                  reviewNote: "",
                  action: "forward" as const,
                };
                const isRejecting = form.action === "reject";
                const isReturningToEmployee = form.action === "return_to_employee";

                return (
                  <div className="user-table-row workflow-return-table-row" key={item.id}>
                    <div className="user-primary-cell">
                      <strong>{item.asset_tag}</strong>
                      <span>{item.equipment_name}</span>
                    </div>
                    <div className="user-secondary-cell">
                      <strong>{item.employee_name}</strong>
                      <span>{item.employee_email}</span>
                      <span>Requested: {formatProfileDate(item.requested_at)}</span>
                    </div>
                    <div className="user-secondary-cell">
                      <strong>{formatReturnReason(item.return_reason)}</strong>
                      <span>{item.request_note || "No employee return note added."}</span>
                    </div>
                    <div className="user-secondary-cell">
                      <strong>{form.conditionStatus}</strong>
                      <span>Disposition: {form.disposition}</span>
                      <span>{isRejecting ? "Return rejected" : isReturningToEmployee ? "Returning to employee" : "Review in progress"}</span>
                    </div>
                    <div className="workflow-table-actions">
                    <div className="fulfillment-control-grid">
                      <label className="field">
                        <span>Decision</span>
                        <select
                          value={form.action}
                          onChange={(event) =>
                            setItReturnReviewForm((current) => ({
                              ...current,
                              [item.id]: {
                                ...form,
                                action: event.target.value as "forward" | "return_to_employee" | "reject",
                              },
                            }))
                          }
                        >
                          <option value="forward">
                            {item.return_reason === "leaving_job" ? "Send for final approval" : "Send for next return step"}
                          </option>
                          <option value="return_to_employee">Return to employee</option>
                          <option value="reject">Reject return</option>
                        </select>
                      </label>
                      <label className="field">
                        <span>Device condition</span>
                        <select
                          value={form.conditionStatus}
                          onChange={(event) =>
                            setItReturnReviewForm((current) => ({
                              ...current,
                              [item.id]: {
                                ...form,
                                conditionStatus: event.target.value,
                              },
                            }))
                          }
                          disabled={isRejecting}
                        >
                          <option value="good">Good</option>
                          <option value="fair">Fair</option>
                          <option value="damaged">Damaged</option>
                          <option value="lost">Lost</option>
                        </select>
                      </label>
                      <label className="field">
                        <span>Store status after approval</span>
                        <select
                          value={form.disposition}
                          onChange={(event) =>
                            setItReturnReviewForm((current) => ({
                              ...current,
                              [item.id]: {
                                ...form,
                                disposition: event.target.value,
                              },
                            }))
                          }
                          disabled={isRejecting || isReturningToEmployee}
                        >
                          <option value="available">Back to stock</option>
                          <option value="maintenance">Needs maintenance</option>
                          <option value="retired">Wasted / destroyed / retire</option>
                          <option value="lost">Mark lost</option>
                        </select>
                      </label>
                    </div>
                    <label className="field">
                      <span>
                        {isRejecting
                          ? "Rejection reason"
                          : isReturningToEmployee
                            ? "Return-to-employee note"
                            : "IT Support receipt note, device status, and accessories"}
                      </span>
                      <textarea
                        value={form.reviewNote}
                        onChange={(event) =>
                          setItReturnReviewForm((current) => ({
                            ...current,
                            [item.id]: {
                              ...form,
                              reviewNote: event.target.value,
                            },
                          }))
                        }
                        placeholder={
                          isRejecting
                            ? "Explain why this return cannot continue"
                            : isReturningToEmployee
                              ? "Explain why the employee keeps the device"
                              : "Record health, missing or returned accessories, charger, bag, keyboard, mouse, and any observed condition details"
                        }
                      />
                    </label>
                    <button
                      className={`primary-btn compact-btn ${isRejecting ? "btn-danger" : isReturningToEmployee ? "btn-success" : "btn-warning"}`}
                      type="button"
                      onClick={() => void handleItReturnReview(item.id)}
                    >
                      {isRejecting ? "Reject return" : isReturningToEmployee ? "Return to employee" : item.return_reason === "leaving_job" ? "Acknowledge and send for final approval" : "Record assessment"}
                    </button>
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="loading-text">No devices are waiting for IT Support receipt right now.</p>
            )}
          </div>
          {renderPaginationBar(reviewPageKey, pendingItReturnReviews.length, reviewCurrentPage, reviewPageSize, (page) =>
            setReturnPageByKey((current) => ({
              ...current,
              [reviewPageKey]: page,
            }))
          )}
        </section>

        <section className="dashboard-panel">
        <div className="panel-header">
          <h3>Legacy Return Intake</h3>
          <span>{pendingReturnIntake.length} pending</span>
        </div>
        <p className="dashboard-subtitle">
          Process older returns that still require legacy intake handling after an earlier IT check.
        </p>
        <div className="user-table workflow-return-table">
          <div className="user-table-head workflow-return-table-head">
            <span>Asset</span>
            <span>Employee</span>
            <span>Return Details</span>
            <span>Status</span>
            <span>Actions</span>
          </div>
          {pendingReturnIntake.length > 0 ? (
            paginatedReturnIntake.map((item) => {
            const form = returnProcessForm[item.id] ?? {
              conditionStatus: item.condition_status || "good",
              disposition: item.disposition || "available",
              intakeNote: "",
              action: "complete" as const,
            };
            const isRejecting = form.action === "reject";

            return (
              <div className="user-table-row workflow-return-table-row" key={item.id}>
                <div className="user-primary-cell">
                  <strong>{item.asset_tag}</strong>
                  <span>{item.equipment_name}</span>
                </div>
                <div className="user-secondary-cell">
                  <strong>{item.employee_name}</strong>
                  <span>{item.employee_email}</span>
                  <span>Requested: {formatProfileDate(item.requested_at)}</span>
                </div>
                <div className="user-secondary-cell">
                  <strong>{item.request_note || "No employee return note added."}</strong>
                  <span>IT checked by: {item.it_manager_name || "IT Manager"} / {formatProfileDate(item.it_reviewed_at)}</span>
                  <span>{item.it_review_note || "No IT review note added."}</span>
                </div>
                <div className="user-secondary-cell">
                  <strong>{item.condition_status || "No condition"}</strong>
                  <span>Recommendation: {item.disposition || "No recommendation"}</span>
                  <span>{isRejecting ? "Rejecting return" : "Ready for intake"}</span>
                </div>
                <div className="workflow-table-actions">
                <div className="fulfillment-control-grid">
                  <label className="field">
                    <span>Decision</span>
                    <select
                      value={form.action}
                      onChange={(event) =>
                        setReturnProcessForm((current) => ({
                          ...current,
                          [item.id]: {
                            ...form,
                            action: event.target.value as "complete" | "reject",
                          },
                        }))
                      }
                    >
                      <option value="complete">Accept return</option>
                      <option value="reject">Reject return</option>
                    </select>
                  </label>
                  <label className="field">
                    <span>Condition</span>
                    <select
                      value={form.conditionStatus}
                      onChange={(event) =>
                        setReturnProcessForm((current) => ({
                          ...current,
                          [item.id]: {
                            ...form,
                            conditionStatus: event.target.value,
                          },
                        }))
                      }
                      disabled={isRejecting}
                    >
                      <option value="good">Good</option>
                      <option value="fair">Fair</option>
                      <option value="damaged">Damaged</option>
                      <option value="lost">Lost</option>
                    </select>
                  </label>
                  <label className="field">
                    <span>After intake</span>
                    <select
                      value={form.disposition}
                      onChange={(event) =>
                        setReturnProcessForm((current) => ({
                          ...current,
                          [item.id]: {
                            ...form,
                            disposition: event.target.value,
                          },
                        }))
                      }
                      disabled={isRejecting}
                    >
                      <option value="available">Back to stock</option>
                      <option value="maintenance">Send to maintenance</option>
                      <option value="retired">Retire / dispose</option>
                      <option value="lost">Mark lost</option>
                    </select>
                  </label>
                </div>
                <label className="field">
                  <span>{isRejecting ? "Rejection reason" : "IT support intake note"}</span>
                  <textarea
                    value={form.intakeNote}
                    onChange={(event) =>
                      setReturnProcessForm((current) => ({
                        ...current,
                        [item.id]: {
                          ...form,
                          intakeNote: event.target.value,
                        },
                      }))
                    }
                    placeholder={isRejecting ? "Explain why this return cannot be accepted" : "Record condition, accessories, or next action"}
                  />
                </label>
                <button
                  className={`primary-btn compact-btn ${isRejecting ? "btn-danger" : form.disposition === "lost" || form.disposition === "retired" ? "btn-warning" : "btn-success"}`}
                  type="button"
                  onClick={() => void handleProcessReturn(item.id)}
                >
                  {isRejecting ? "Reject return" : "Complete intake"}
                </button>
                </div>
              </div>
            );
            })
          ) : (
            <p className="loading-text">No return requests are waiting for store intake right now.</p>
          )}
        </div>
          {renderPaginationBar(intakePageKey, pendingReturnIntake.length, intakeCurrentPage, intakePageSize, (page) =>
            setReturnPageByKey((current) => ({
              ...current,
              [intakePageKey]: page,
            }))
          )}
        </section>

      <section className="dashboard-panel">
        <div className="panel-header">
          <h3>Maintenance Workflow</h3>
          <span>{openMaintenanceRecords.length} under repair</span>
        </div>
        <p className="dashboard-subtitle">
          Devices sent to maintenance by IT stay here until IT Support Engineer records whether they were repaired or not repairable.
        </p>
        <div className="user-table workflow-return-table">
          <div className="user-table-head workflow-return-table-head">
            <span>Asset</span>
            <span>Location</span>
            <span>Problem</span>
            <span>Status</span>
            <span>Actions</span>
          </div>
          {openMaintenanceRecords.length > 0 ? (
            paginatedMaintenanceRecords.map((record) => {
              const form = maintenanceCloseForm[record.id] ?? {
                maintenanceStatus: "repaired" as const,
                finalDisposition: "available",
                resolutionNote: "",
              };

              return (
                <div className="user-table-row workflow-return-table-row" key={`maintenance-${record.id}`}>
                  <div className="user-primary-cell">
                    <strong>{record.asset_tag}</strong>
                    <span>{record.equipment_name}</span>
                  </div>
                  <div className="user-secondary-cell">
                    <strong>{record.branch_name || "No branch"}</strong>
                    <span>Started: {formatProfileDate(record.started_at)}</span>
                  </div>
                  <div className="user-secondary-cell">
                    <strong>{record.problem_description || "No maintenance description."}</strong>
                    <span>Condition: {record.condition_status || "Not recorded"}</span>
                  </div>
                  <div className="user-secondary-cell">
                    <strong>{form.maintenanceStatus}</strong>
                    <span>Final stock status: {form.finalDisposition}</span>
                  </div>
                  <div className="workflow-table-actions">
                  <div className="fulfillment-control-grid">
                    <label className="field">
                      <span>Repair result</span>
                      <select
                        value={form.maintenanceStatus}
                        onChange={(event) =>
                          setMaintenanceCloseForm((current) => ({
                            ...current,
                            [record.id]: {
                              ...form,
                              maintenanceStatus: event.target.value as "repaired" | "not_repairable",
                              finalDisposition: event.target.value === "repaired" ? "available" : "retired",
                            },
                          }))
                        }
                      >
                        <option value="repaired">Repaired</option>
                        <option value="not_repairable">Not repairable</option>
                      </select>
                    </label>
                    <label className="field">
                      <span>Final stock status</span>
                      <select
                        value={form.finalDisposition}
                        onChange={(event) =>
                          setMaintenanceCloseForm((current) => ({
                            ...current,
                            [record.id]: {
                              ...form,
                              finalDisposition: event.target.value,
                            },
                          }))
                        }
                      >
                        <option value="available">Back to stock</option>
                        <option value="retired">Wasted / destroyed / retire</option>
                        <option value="lost">Lost</option>
                        <option value="maintenance">Keep under maintenance</option>
                      </select>
                    </label>
                  </div>
                  <label className="field">
                    <span>Resolution note</span>
                    <textarea
                      value={form.resolutionNote}
                      onChange={(event) =>
                        setMaintenanceCloseForm((current) => ({
                          ...current,
                          [record.id]: {
                            ...form,
                            resolutionNote: event.target.value,
                          },
                        }))
                      }
                      placeholder="Repair result, parts replaced, or reason it is wasted/destroyed"
                    />
                  </label>
                  <button
                    className={`primary-btn compact-btn ${form.finalDisposition === "lost" || form.finalDisposition === "retired" ? "btn-warning" : "btn-success"}`}
                    type="button"
                    onClick={() => void handleCompleteMaintenance(record.id)}
                  >
                    Complete maintenance
                  </button>
                  </div>
                </div>
              );
            })
          ) : (
            <p className="loading-text">No devices are currently under repair.</p>
          )}
        </div>
          {renderPaginationBar(maintenancePageKey, openMaintenanceRecords.length, maintenanceCurrentPage, maintenancePageSize, (page) =>
            setReturnPageByKey((current) => ({
              ...current,
              [maintenancePageKey]: page,
            }))
          )}
        </section>
      </>
    );
  };

  const renderEmployeeReturnRequestsSection = () => {
    const activeAssignments = employeeAssignments.filter((assignment) => assignment.status === "active");
    const requestReturnPageKey = "return-requests-active-assignments";
    const requestReturnPageSize = pageSizeByKey[requestReturnPageKey] || DEFAULT_ITEMS_PER_PAGE;
    const requestReturnTotalPages = Math.max(Math.ceil(activeAssignments.length / requestReturnPageSize), 1);
    const requestReturnCurrentPage = Math.min(returnPageByKey[requestReturnPageKey] || 1, requestReturnTotalPages);
    const paginatedActiveAssignments = paginateRows(activeAssignments, requestReturnCurrentPage, requestReturnPageSize);

    const historyPageKey = "return-requests-history";
    const historyPageSize = pageSizeByKey[historyPageKey] || DEFAULT_ITEMS_PER_PAGE;
    const historyTotalPages = Math.max(Math.ceil(employeeReturnRequests.length / historyPageSize), 1);
    const historyCurrentPage = Math.min(returnPageByKey[historyPageKey] || 1, historyTotalPages);
    const paginatedReturnHistory = paginateRows(employeeReturnRequests, historyCurrentPage, historyPageSize);

    return (
      <section className="dashboard-panel">
        <div className="panel-header">
          <h3>Return Requests</h3>
        </div>

        <div className="subpanel-header">
          <h4>Request Equipment Return</h4>
        </div>
        <div className="user-table workflow-return-table">
          <div className="user-table-head workflow-return-table-head">
            <span>Asset</span>
            <span>Assignment</span>
            <span>Return Type</span>
            <span>Return Note</span>
            <span>Actions</span>
          </div>
          {activeAssignments.length > 0 ? (
            paginatedActiveAssignments.map((assignment) => {
              const hasPendingReturn = employeeReturnRequests.some(
                (item) =>
                  item.assignment_id === assignment.id &&
                  ["it_review", "store_intake", "maintenance", "requested", "awaiting_final_approval"].includes(item.return_status),
              );

              return (
                <div className="user-table-row workflow-return-table-row" key={assignment.id}>
                  <div className="user-primary-cell">
                    <strong>{assignment.asset_tag}</strong>
                    <span>{assignment.equipment_name}</span>
                  </div>
                  <div className="user-secondary-cell">
                    <strong>Assigned: {formatProfileDate(assignment.assigned_at)}</strong>
                    <span>Expected return: {formatProfileDate(assignment.expected_return_date)}</span>
                  </div>
                  <label className="field">
                    <span>Return type</span>
                    <select
                      value={returnRequestReasons[assignment.id] || "standard"}
                      onChange={(event) =>
                        setReturnRequestReasons((current) => ({
                          ...current,
                          [assignment.id]: event.target.value as "standard" | "leaving_job",
                        }))
                      }
                      disabled={hasPendingReturn}
                    >
                      <option value="standard">Standard return</option>
                      <option value="leaving_job">Employee leaving job</option>
                    </select>
                  </label>
                  <label className="field">
                    <span>Return note</span>
                    <textarea
                      value={returnRequestNotes[assignment.id] || ""}
                      onChange={(event) =>
                        setReturnRequestNotes((current) => ({
                          ...current,
                          [assignment.id]: event.target.value,
                        }))
                      }
                      placeholder={
                        (returnRequestReasons[assignment.id] || "standard") === "leaving_job"
                          ? "Add device condition, accessories handed over, and any missing items"
                          : "Add condition, reason, or handover note"
                      }
                      disabled={hasPendingReturn}
                    />
                  </label>
                  <div className="workflow-table-actions">
                    <button
                      className="primary-btn compact-btn"
                      type="button"
                      onClick={() => void handleRequestReturn(assignment.id)}
                      disabled={hasPendingReturn}
                    >
                      {hasPendingReturn ? "Return requested" : "Submit return request"}
                    </button>
                  </div>
                </div>
              );
            })
          ) : (
            <p className="loading-text">No active equipment is available to return right now.</p>
          )}
        </div>
        {renderPaginationBar(requestReturnPageKey, activeAssignments.length, requestReturnCurrentPage, requestReturnPageSize, (page) =>
          setReturnPageByKey((current) => ({
            ...current,
            [requestReturnPageKey]: page,
          }))
        )}

        <div className="subpanel-header">
          <h4>My Return History</h4>
        </div>
        <div className="user-table workflow-return-table">
          <div className="user-table-head workflow-return-table-head">
            <span>Asset</span>
            <span>Status</span>
            <span>Return Type</span>
            <span>Timeline</span>
            <span>Notes</span>
          </div>
          {employeeReturnRequests.length > 0 ? (
            paginatedReturnHistory.map((item) => (
              <div className="user-table-row workflow-return-table-row" key={item.id}>
                <div className="user-primary-cell">
                  <strong>{item.asset_tag}</strong>
                  <span>{item.equipment_name}</span>
                </div>
                <div className="user-secondary-cell">
                  <strong>{formatReturnStatus(item.return_status)}</strong>
                </div>
                <div className="user-secondary-cell">
                  <strong>{formatReturnReason(item.return_reason)}</strong>
                </div>
                <div className="user-secondary-cell">
                  <strong>Requested: {formatProfileDate(item.requested_at)}</strong>
                  {item.returned_at || item.it_reviewed_at ? <span>Processed: {formatProfileDate(item.returned_at || item.it_reviewed_at)}</span> : null}
                </div>
                <div className="user-secondary-cell">
                  <strong>{item.request_note || "No return note added."}</strong>
                  {item.it_review_note ? <span>IT note: {item.it_review_note}</span> : null}
                  {item.intake_note ? <span>Store note: {item.intake_note}</span> : null}
                </div>
              </div>
            ))
          ) : (
            <p className="loading-text">No return requests submitted yet.</p>
          )}
        </div>
        {renderPaginationBar(historyPageKey, employeeReturnRequests.length, historyCurrentPage, historyPageSize, (page) =>
          setReturnPageByKey((current) => ({
            ...current,
            [historyPageKey]: page,
          }))
        )}
      </section>
    );
  };

  const renderSettingsSection = () => <AccountSettingsPanel user={user} onUserUpdate={onUserUpdate} />;

  const renderSection = () => {
    if (activeSection === "overview") {
      return renderOverview();
    }

    if (activeSection === "approvals" || activeSection === "fulfillment" || activeSection === "new-request") {
      return renderActionSection();
    }

    if (activeSection === "assets" || activeSection === "employees" || activeSection === "equipment" || activeSection === "stock" || activeSection === "my-requests") {
      return renderSecondarySection();
    }

    if (activeSection === "my-equipment") {
      return renderMyEquipmentSection();
    }

    if (activeSection === "return-requests") {
      return renderEmployeeReturnRequestsSection();
    }

    if (activeSection === "returns") {
      return roleView === "it-manager" ? renderItManagerReturnChecksSection() : renderStorekeeperReturnsSection();
    }

    if (activeSection === "timeline") {
      return renderTimelineSection();
    }

    if (activeSection === "reports") {
      return renderReportsSection();
    }

    if (activeSection === "notifications") {
      return renderNotificationsSection();
    }

    if (activeSection === "settings") {
      return renderSettingsSection();
    }

    return renderOverview();
  };

  const renderDetailPanel = () =>
    selectedDetailPanel ? (
      <div className="dashboard-detail-overlay" role="presentation" onClick={closeDetailPanel}>
        <aside
          className="dashboard-detail-card"
          role="dialog"
          aria-modal="true"
          aria-label="Record details"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="dashboard-detail-head">
            <div>
              <p className="dashboard-detail-kicker">{selectedDetailPanel.type}</p>
              <h3>{selectedDetailPanel.title}</h3>
              <p>{selectedDetailPanel.subtitle}</p>
            </div>
            <button className="secondary-btn compact-btn" type="button" onClick={closeDetailPanel}>
              Close
            </button>
          </div>
          <div className="dashboard-detail-grid">
            {selectedDetailPanel.rows.map((row) => (
              <article className="dashboard-detail-item" key={`${selectedDetailPanel.type}-${row.label}`}>
                <small>{row.label}</small>
                <strong>{row.value}</strong>
              </article>
            ))}
          </div>
          {selectedDetailPanel.qrEquipment ? (
            <section className="dashboard-detail-qr-section">
              <div className="panel-header">
                <h4>Equipment QR</h4>
              </div>
              {isEquipmentQrLoading ? (
                <p className="loading-text">Generating item QR code...</p>
              ) : equipmentQrError ? (
                <p className="error-text">{equipmentQrError}</p>
              ) : selectedQrEquipment && equipmentQrImageUrl && selectedQrEquipment.id === selectedDetailPanel.qrEquipment.id ? (
                <div className={`qr-card stacked-qr-card${selectedQrAudience === "employee" ? " employee-qr-card" : ""}`}>
                  <div className="qr-preview">
                    <img src={equipmentQrImageUrl} alt={`${selectedQrEquipment.asset_tag} QR code`} />
                  </div>
                  <div className="qr-details">
                    <h4>{selectedQrEquipment.equipment_name}</h4>
                    <p><strong>Asset tag:</strong> {selectedQrEquipment.asset_tag}</p>
                    <p><strong>Serial number:</strong> {selectedQrEquipment.serial_number}</p>
                    <p><strong>Model:</strong> {selectedQrEquipment.model_name || "Not set"}</p>
                    <p><strong>Computer name:</strong> {selectedQrEquipment.computer_name || "Not set"}</p>
                    <p><strong>Specs:</strong> {formatEquipmentSpecs(selectedQrEquipment) || "Not set"}</p>
                    <p><strong>Warranty end:</strong> {formatQrDate(selectedQrEquipment.warranty_end_date)}</p>
                    <button className="primary-btn qr-download-btn" type="button" onClick={handleDownloadEquipmentQr}>
                      Download QR
                    </button>
                  </div>
                </div>
              ) : (
                <p className="loading-text">Preparing QR details...</p>
              )}
            </section>
          ) : null}
        </aside>
      </div>
    ) : null;

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
          {config.sidebarGroups.map((group) => (
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
                <span className={`sidebar-chevron ${expandedGroups[group.title] ? "is-open" : ""}`} aria-hidden="true">
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
            <h1>{config.title}</h1>
          </div>
          <div className="dashboard-topbar-right">
            <button
              className="notification-icon-button"
              type="button"
              aria-label="Open notifications"
              onClick={() => setActiveSection("notifications")}
            >
              <Bell size={19} strokeWidth={2.4} />
              {unreadNotificationCount > 0 ? <span className="notification-count-badge">{unreadNotificationCount}</span> : null}
            </button>
            <UserMenu user={user} onOpenProfile={() => setActiveSection("settings")} onLogout={onLogout} />
          </div>
        </header>

        <main className="dashboard-content">
          <div className="dashboard-heading-row">
            <div>
              <h2>
                {activeSection
                  .split("-")
                  .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
                  .join(" ")}
              </h2>
              <p className="dashboard-subtitle">{config.subtitle}</p>
            </div>
            <div className="dashboard-breadcrumb">
              <span>Home</span>
              <span>/</span>
              <span>{config.chipLabel}</span>
              <span>/</span>
              <span>
                {activeSection
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
                setEquipmentQrError("");
              }}
            />
          ) : null}
          <div className="section-view-shell">
            {isLoading ? (
              <DashboardWaveLoader
                title="Loading dashboard"
              />
            ) : null}
            {!isLoading && dashboardData ? (
              <>
                {renderSmartAlertsPanel()}
                {renderSection()}
              </>
            ) : null}
          </div>
          {pendingSubmitState ? (
            <div className="dashboard-processing-overlay" role="presentation">
              <div className="dashboard-processing-panel">
                <DashboardWaveLoader
                  compact
                  title={pendingSubmitState.title}
                />
              </div>
            </div>
          ) : null}
        </main>

        <footer className="dashboard-footer">
          <p>Copyright 2026 Airtel IMS. All rights reserved.</p>
          <span>Version 1.0.0</span>
        </footer>
      </div>
      {renderDetailPanel()}
    </div>
  );
}

export default WorkflowRoleDashboard;
