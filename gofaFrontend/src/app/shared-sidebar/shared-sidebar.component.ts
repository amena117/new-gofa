import { Component, OnInit, OnDestroy, Output, EventEmitter } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';
import { TransitService } from '../transit/services/transit.service';
import { MaintenanceRequestService } from '../services/maintenance-request.service';
import { Subscription, interval } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

interface MenuItem {
  label: string;
  link: string;
  roles: string[];
  hideLabel?: boolean; // Optional property to hide the label
}

@Component({
  selector: 'app-shared-sidebar',
  templateUrl: './shared-sidebar.component.html',
  styleUrls: ['./shared-sidebar.component.css'],
  standalone: false
})
export class SharedSidebarComponent implements OnInit, OnDestroy {
  @Output() sidebarToggle = new EventEmitter<boolean>();
  showSidebar: boolean = false;
  firstname: string = '';
  lastname: string = '';
  role: string = '';
  isLoginPage: boolean = false;
  pendingItemsCount: number = 0;
  pendingLettersCount: number = 0;
  pendingSparePartsCount: number = 0;
  pendingAssignmentsCount: number = 0;
  sparePartIssuedCount: number = 0;   // ← new: "ministore responded" badge
  undeliveredMaintainedCount: number = 0; // New badge for PPC
  doOutCount: number = 0; // New badge for Do Out
  pendingMaintRequestsCount: number = 0; // New badge for Team Leaders
  private refreshSubscription?: Subscription;
  private refreshNotificationsSub?: Subscription;

  private readonly SEEN_KEY = 'seenIssuedSparePartIds';
  

  menuItems: MenuItem[] = [
    { label: 'Unit Leader Dashboard / የቡድን መሪ ዳሽቦርድ', link: '/maintenance/unit-leader-dashboard', roles: ['PTEAM_LEADER', 'OTEAM_LEADER', 'VTEAM_LEADER', 'HTEAM_LEADER', 'RTEAM_LEADER'] },
    { label: 'Dashboard / ዳሽቦርድ', link: '/maintenance/dashboard', roles: ['PPC', 'MAINTENANCE_LEADER', 'MAINTENANCE_ADMIN'] },
    // VHF, HF, SPAREPART, ELECTRONICS Roles
    { label: 'Store Dashboard / የስቶር ዳሽቦርድ', link: '/inventory-summary', roles: ['VHF', 'HF', 'SPAREPART', 'ELECTRONICS'] },
    { label: 'Team Leader Dashboard / የቡድን መሪ ዳሽቦርድ', link: '/team-leader-dashboard', roles: ['SUPPLY_AND_DISTRIBUTION_TEAMLEADER']},
    { label: 'Items / የእቃ ዝርዝር', link: '/items', roles: ['VHF', 'HF', 'SPAREPART', 'ELECTRONICS', 'SUPPLY_AND_DISTRIBUTION_TEAMLEADER'] },
    { label: 'Accessories / አባሪዎች', link: '/accessories', roles: ['VHF', 'HF', 'SPAREPART', 'ELECTRONICS', 'SUPPLY_AND_DISTRIBUTION_TEAMLEADER'] },
    { label: 'Register Item / እቃ ምዝገባ', link: '/register-item', roles: ['VHF', 'HF', 'SPAREPART', 'ELECTRONICS'] },
    { label: 'Existing Item / ነባር እቃ ገቢ ', link: '/add-item-quantity', roles: ['VHF', 'HF', 'SPAREPART', 'ELECTRONICS'] },
    { label: 'Model22 Registration / ሞዴል 22 መዝግብ', link: 'model22register', roles: ['VHF', 'HF', 'SPAREPART', 'ELECTRONICS'] },
    { label: 'Received item report / የገቢ ሪፖርት', link: '/transaction-report', roles: ['VHF', 'HF', 'SPAREPART', 'ELECTRONICS', 'SUPPLY_AND_DISTRIBUTION_TEAMLEADER'] },
    
    
    // { label: 'Received Items List / የገቢ እቃ ዝርዝር', link: '/item-transaction-history', roles: ['VHF', 'HF', 'SPAREPART', 'ELECTRONICS'] },
    
    
    
    
    { label: 'New Items From Transit / ከትራንዚት የተላኩ እቃዎች', link: '/from-transit', roles: ['VHF', 'HF', 'SPAREPART', 'ELECTRONICS'] },
    
    
    
    // { label: 'Model22 Report / ሞዴል 22 ሪፖርት', link: '/model22report', roles: ['VHF', 'HF', 'SPAREPART', 'ELECTRONICS'] },
    
    
    
    
    
    // { 
    //   label: 'Item Detail', 
    //   link: '/item-detail/:id', 
    //   roles: ['VHF', 'HF', 'SPAREPART', 'ELECTRONICS'], 
    //   hideLabel: true // Hide this label in the sidebar
    // },
    // { 
    //   label: 'withdraw', 
    //   link: '/withdraw-quantity/:id', 
    //   roles: ['VHF', 'HF', 'SPAREPART', 'ELECTRONICS'], 
    //   hideLabel: true // Hide this label in the sidebar
    // },
    // { 
    //   label: 'Add item', 
    //   link: '/add-quantity/:id', 
    //   roles: ['VHF', 'HF', 'SPAREPART', 'ELECTRONICS'], 
    //   hideLabel: true // Hide this label in the sidebar
    // },

    
     { label: 'Dashboard', link: '/MasterCard/dashboard', roles: ['PROPERTY_CONTROL', 'PROPERTY_CONTROL_TEAMLEADER'] },
    { label: 'Mastercard List / ማስተርካርድ ዝርዝር', link: '/MasterCard/mastercard-list', roles: ['PROPERTY_CONTROL', 'PROPERTY_CONTROL_TEAMLEADER'] },
    { label: 'Mastercard Form / ማስተርካርድ ቅጽ', link: '/MasterCard/mastercard-form', roles: ['PROPERTY_CONTROL', 'PROPERTY_CONTROL_TEAMLEADER'] },
    { label: 'Mastercard Report /ማስተርካርድ ሪፖርት', link: 'MasterCard/report', roles: ['PROPERTY_CONTROL', 'PROPERTY_CONTROL_TEAMLEADER'] },

    { label: 'Model 2 / ሞዴል ሁለት', link: '/MasterCard/request-order-for-issue', roles: ['PROPERTY_CONTROL', 'PROPERTY_CONTROL_TEAMLEADER'] },
    { label: 'Model 2 list / ሞዴል ሁለት ዝርዝሮች', link: '/MasterCard/request-roder-list', roles: ['PROPERTY_CONTROL', 'PROPERTY_CONTROL_TEAMLEADER','VHF', 'HF', 'SPAREPART', 'ELECTRONICS'] },
    { 
      label: 'details', 
      link: '/ /MasterCard/master-card-details/:id', 
      roles: ['PROPERTY_CONTROL', 'PROPERTY_CONTROL_TEAMLEADER','VHF', 'HF', 'SPAREPART', 'ELECTRONICS'], 
      hideLabel: true // Hide this label in the sidebar
    },
    { 
      label: 'Model 2 report/ ሞዴል ሁለት ሪፖርት ', 
      link: '/MasterCard/request-order/report', 
      roles: ['PROPERTY_CONTROL', 'PROPERTY_CONTROL_TEAMLEADER'], 
     
    },
    { label: 'Model22 Report / ሞዴል 22 ሪፖርት', link: '/model22-list', roles: ['VHF', 'HF', 'SPAREPART', 'ELECTRONICS', 'SUPPLY_AND_DISTRIBUTION_TEAMLEADER', 'PROPERTY_CONTROL', 'PROPERTY_CONTROL_TEAMLEADER'] },
    { label: 'Item Distribution / የእቃ ስርጭት', link: '/item-distribution-report', roles: ['VHF', 'HF', 'SPAREPART', 'ELECTRONICS', 'SUPPLY_AND_DISTRIBUTION_TEAMLEADER', 'PROPERTY_CONTROL'] },
    { label: 'User Performance / የተጠቃሚ አፈጻጸም', link: '/user-performance', roles: ['SUPPLY_AND_DISTRIBUTION_TEAMLEADER']},


    
    // TRANSIT Role
    { label: 'MODEL 1 / ሞዴል 1', link: '/transit/received-items', roles: ['TRANSIT', 'PROPERTY_CONTROL', 'PROPERTY_CONTROL_TEAMLEADER'] },
    { label: 'MODEL 2 / ሞዴል 2', link: '/transit/model2-list', roles: ['TRANSIT'] },
    { label: 'MODEL 1 Report / ሞዴል 1 ሪፖርት', link: '/transit/model1-report', roles: ['TRANSIT'] },
    {
      label: 'model2 add',
      link: '/transit/model2-add',
      roles: ['TRANSIT'],
      hideLabel: true // Hide this label in the sidebar
    },

    {
      label: 'model2 edit',
      link: '/transit/model2-edit/:id',
      roles: ['TRANSIT'],
      hideLabel: true // Hide this label in the sidebar
    },


    {
      label: 'model2 add',
      link: '/transit/model2-edit/:id',
      roles: ['TRANSIT'],
      hideLabel: true // Hide this label in the sidebar
    },

    {
      label: 'model2 detail',
      link: '/transit/model2-detail/:id',
      roles: ['TRANSIT'],
      hideLabel: true // Hide this label in the sidebar
    },



    {
      label: 'recieve',
      link: '/transit/receive-item-form',
      roles: ['TRANSIT'],
      hideLabel: true // Hide this label in the sidebar
    },

    {
      label: 'recieve edit',
      link: 'transit/edit-item/:id',
      roles: ['TRANSIT'],
      hideLabel: true // Hide this label in the sidebar
    },




    {
      label: 'recieve',
      link: 'transit/view-details/:id',
      roles: ['TRANSIT'],
      hideLabel: true // Hide this label in the sidebar
    },
    // ADMIN Role
    { label: 'Shelf / መደርደሪያ', link: '/shelf', roles: ['SUPER_ADMIN', 'SANDD_ADMIN'] },
    { label: 'Shelves / መደርደሪያዎች', link: '/shelves', roles: ['SUPER_ADMIN', 'SANDD_ADMIN'] },
    { label: 'Warehouse / መጋዘን', link: '/warehouse', roles: ['SUPER_ADMIN', 'SANDD_ADMIN'] },
    { label: 'Warehouses / መጋዘኖች', link: '/warehouses', roles: ['SUPER_ADMIN', 'SANDD_ADMIN'] },
    { label: 'Admin Dashboard / አስተዳዳሪ ዳሽቦርድ', link: '/SUPER_ADMIN', roles: ['ADMIN'] },
    { label: 'Users / ተጠቃሚዎች', link: '/users', roles: ['SUPER_ADMIN', 'SANDD_ADMIN', 'MAINTENANCE_ADMIN'] },
    { label: 'Register / መዝገብ', link: '/register', roles: ['SUPER_ADMIN', 'SANDD_ADMIN'] },
    { label: 'Item Category / የእቃ ምድብ', link: '/item-types', roles: ['VHF', 'HF', 'SPAREPART', 'ELECTRONICS'] },
    

    // MANAGER Role
{ label: 'የሜንቴናንስ ጥያቄ ይመዝግቡ', link: '/maintenance/request-form', roles: ['PPC'] },
{ label: 'ለሜንቴናንስ ክፍሎች ይላኩ', link: '/maintenance/request-list', roles: ['PPC'] },
{ label: 'ለደንበኞች ይሰረክቡ', link: '/maintenance/Give-maintainedEqupment', roles: ['PPC', 'QUALITY', 'MAINTENANCE_LEADER', 'MAINTENANCE_REPORTING'] },
{ label: 'የተጠገኑ መረጃ ይመልከቱ', link: '/maintenance/view-client-data', roles: ['PPC'] },
{ label: 'ሁሉም ጥያቄዎች ይመልከቱ', link: '/maintenance/power-maintReqList', roles: ['PPC', 'MAINTENANCE_LEADER'] },
{ label: 'የንብረቶችን ሞደል ይመዝግቡ', link: '/maintenance/equipmentadd', roles: ['PPC'] },
{ label: 'የሞዴሎችን ዝርዝር ይመልከቱ', link: '/maintenance/equipments', roles: ['PPC']},  



//POWER, OFFICE_MACHINE, RADIO MAINTENANCE TECHNICIANS
{ label: 'የሜንቴናንስ ጥያቄዎች ዝርዝር', link: '/maintenance/power-maintReqList', roles: ['POWER_MAINTENANCE', 'OFFICE_MACHINE_MAINTENANCE', 'COMPUTER_MAINTENANCE', 'VHF_MAINTENANCE', 'HF_MAINTENANCE', 'IT_MAINTENANCE', 'RADIO_MAINTENANCE', 'POWER', 'OFFICE_MACHINE', 'VHF_RADIO', 'HF_RADIO', 'PTEAM_LEADER', 'RTEAM_LEADER', 'OTEAM_LEADER', 'HTEAM_LEADER', 'ELECTRICAL_MAINTENANCE', 'MECHANICAL_MAINTENANCE', 'WELDING_MAINTENANCE'] },
{ label: 'የተሰጡ የስፓርፓርቶች', link: '/maintenance/givenSparesto', roles: ['POWER_MAINTENANCE', 'OFFICE_MACHINE_MAINTENANCE', 'COMPUTER_MAINTENANCE', 'VHF_MAINTENANCE', 'HF_MAINTENANCE', 'IT_MAINTENANCE', 'RADIO_MAINTENANCE', 'POWER', 'OFFICE_MACHINE', 'VHF_RADIO', 'HF_RADIO', 'PTEAM_LEADER', 'HTEAM_LEADER', 'RTEAM_LEADER', 'OTEAM_LEADER', 'ELECTRICAL_MAINTENANCE', 'MECHANICAL_MAINTENANCE', 'WELDING_MAINTENANCE'] },
{ label: 'የተጠገኑ ዝርዝሮች ', link: '/maintenance/Give-maintainedEqupment', roles: ['POWER_MAINTENANCE', 'OFFICE_MACHINE_MAINTENANCE', 'COMPUTER_MAINTENANCE', 'VHF_MAINTENANCE', 'HF_MAINTENANCE', 'IT_MAINTENANCE', 'RADIO_MAINTENANCE', 'POWER', 'OFFICE_MACHINE', 'VHF_RADIO', 'HF_RADIO', 'PTEAM_LEADER', 'RTEAM_LEADER', 'OTEAM_LEADER', 'HTEAM_LEADER', 'ELECTRICAL_MAINTENANCE', 'MECHANICAL_MAINTENANCE', 'WELDING_MAINTENANCE'] },
// { label: 'የተጠገኑ እቃዎች ዝርዝር', link: '/maintenance/maintained-list', roles: ['PTEAM_LEADER', 'OTEAM_LEADER', 'VTEAM_LEADER', 'HTEAM_LEADER', 'RTEAM_LEADER', 'POWER_MAINTENANCE', 'OFFICE_MACHINE_MAINTENANCE', 'COMPUTER_MAINTENANCE', 'VHF_MAINTENANCE', 'HF_MAINTENANCE', 'RADIO_MAINTENANCE', 'POWER', 'OFFICE_MACHINE', 'VHF_RADIO', 'HF_RADIO', 'ELECTRICAL_MAINTENANCE', 'MECHANICAL_MAINTENANCE', 'WELDING_MAINTENANCE'] },
{ label: 'Spare Handover Confirmation', link: '/maintenance/handover-confirmation', roles: ['POWER_MAINTENANCE', 'OFFICE_MACHINE_MAINTENANCE', 'COMPUTER_MAINTENANCE', 'VHF_MAINTENANCE', 'HF_MAINTENANCE', 'RADIO_MAINTENANCE', 'POWER', 'OFFICE_MACHINE', 'VHF_RADIO', 'HF_RADIO', 'ELECTRICAL_MAINTENANCE', 'MECHANICAL_MAINTENANCE', 'WELDING_MAINTENANCE'] },

//MINISTORE
{ label: 'ደብዳቤ ይቀበሉ', link: '/maintenance/Add_Letter', roles: ['MAINTENANCE_LEADER']},
{ label: 'የሜንቴናንስ ደብዳቤዎች', link: '/maintenance/letter_fetch', roles: ['MAINTENANCE_LEADER', 'PPC'] },
{ label: 'የስፓርፓርቶች ጥያቄዎች', link: '/maintenance/spare-parts-requests', roles: ['MINISTORE', 'MAINTENANCE_LEADER', 'OTEAM_LEADER', 'PTEAM_LEADER', 'RTEAM_LEADER', 'HTEAM_LEADER', 'VTEAM_LEADER'] },
{ label: 'የስፓርፓርቶች ዋጋ', link: '/maintenance/spare-parts-respond', roles: ['MINISTORE'] },
{ label: 'ስፓርፓርት መስጫ ፎርም', link: '/maintenance/issue-spare-form', roles: ['MINISTORE'] },
{ label: 'የትውስት መሳሪያ ያስገቡ ', link: '/maintenance/special-toolss/add', roles: ['MINISTORE'] },
{ label: 'የትውስት መሳሪያዎች መረጃ', link: '/maintenance/special-tools', roles: ['MINISTORE', 'MAINTENANCE_LEADER'] },
{ label: 'ቢንካርድ ያስገቡ ', link: '/maintenance/addministorebincard', roles: ['MINISTORE'] },
{ label: 'ቢንካርድ ይመልከቱ ', link: '/maintenance/bincard-list', roles: ['MINISTORE', 'MAINTENANCE_LEADER'] },
{ label: 'ፓርት ነምበር  ዝርዝሮች ', link: '/maintenance/view-serials', roles: ['MINISTORE','MAINTENANCE_LEADER'] },
{ label: 'የፓርት ነምበር ሪፖርት', link: '/maintenance/report-ministore', roles: ['MINISTORE', 'MAINTENANCE_LEADER']},
{ label: 'የጥገና ወጪ ሪፖርት', link: '/maintenance/cost-report', roles: ['MAINTENANCE_LEADER', 'PPC', 'PTEAM_LEADER', 'OTEAM_LEADER', 'RTEAM_LEADER', 'VTEAM_LEADER', 'HTEAM_LEADER']},
{ label: 'Performance Report / የአፈጻጸም ሪፖርት', link: '/maintenance/performance-report', roles: ['MAINTENANCE_LEADER', 'PTEAM_LEADER', 'OTEAM_LEADER', 'RTEAM_LEADER', 'VTEAM_LEADER', 'HTEAM_LEADER']},
// { label: 'ቢንካርድ መደመር ', link: '/maintenance/receive-spare-form-12', roles: ['MINISTORE'] },

  { label: 'Do Out ዝርዝር', link: '/maintenance/doOut', roles: ['PPC','MAINTENANCE_LEADER', 'OTEAM_LEADER', 
  'PTEAM_LEADER', 'RTEAM_LEADER', 'VTEAM_LEADER', 'HTEAM_LEADER', 'QUALITY',
  'POWER', 'OFFICE_MACHINE', 'COMPUTER_MAINTENANCE', 'RADIO_MAINTENANCE', 'VHF_RADIO', 'HF_RADIO',
  'POWER_MAINTENANCE', 'OFFICE_MACHINE_MAINTENANCE', 'VHF_MAINTENANCE', 'HF_MAINTENANCE', 'IT_MAINTENANCE',
  'ELECTRICAL_MAINTENANCE', 'MECHANICAL_MAINTENANCE', 'WELDING_MAINTENANCE'
] },

// MAINTENANCE_REPORTING Role — read-only: cost report + maintained list only
{ label: 'የጥገና ወጪ ሪፖርት', link: '/maintenance/cost-report', roles: ['MAINTENANCE_REPORTING'] },
{ label: 'ጥገና ተጠናቀቀ / Maintained Lists', link: '/maintenance/Give-maintainedEqupment', roles: ['MAINTENANCE_REPORTING'] },]

  
  
  
  
  
  
  
  

  constructor(
    private router: Router, 
    private authService: AuthService,
    private transitService: TransitService,
    private maintenanceRequestService: MaintenanceRequestService,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    this.loadUserDetails();
    console.log('User role:', this.role); // Debug log
    this.loadPendingItemsCount();
    this.loadPendingLettersCount();
    this.loadPendingSparePartsCount();
    this.loadPendingAssignmentsCount();
    this.loadSparePartIssuedCount();
    this.loadUndeliveredMaintainedCount();
    this.loadDoOutCount();
    this.loadPendingMaintRequestsCount();
    
    // Refresh pending items and letters count every 30 seconds
    this.refreshSubscription = interval(30000).subscribe(() => {
      this.loadPendingItemsCount();
      this.loadPendingLettersCount();
      this.loadPendingSparePartsCount();
      this.loadPendingAssignmentsCount();
      this.loadSparePartIssuedCount();
      this.loadUndeliveredMaintainedCount();
      this.loadDoOutCount();
      this.loadPendingMaintRequestsCount();
    });

    this.refreshNotificationsSub = this.maintenanceRequestService.refreshNotifications$.subscribe(() => {
      this.loadPendingItemsCount();
      this.loadPendingLettersCount();
      this.loadPendingSparePartsCount();
      this.loadPendingAssignmentsCount();
      this.loadSparePartIssuedCount();
      this.loadUndeliveredMaintainedCount();
      this.loadDoOutCount();
      this.loadPendingMaintRequestsCount();
    });
    
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe(() => {
        const currentRoute = this.normalizeRoute(this.router.url);
        this.isLoginPage = currentRoute === '/login';
        
        if (this.isLoginPage) {
          this.showSidebar = false;
          this.sidebarToggle.emit(false);
        }
        // Don't automatically show sidebar on navigation - let user control it
        
        this.updateBodyClass();
        this.loadUserDetails();

        // Clear "spare parts issued" badge when user lands on the given spare parts page
        if (currentRoute.includes('/maintenance/givenSparesto')) {
          this.markSparePartsAsSeen();
        }
      });

    // Check screen size on init
    if (window.innerWidth <= 768) {
      this.showSidebar = false;
      this.sidebarToggle.emit(false);
    }
  }

  ngOnDestroy(): void {
    document.body.classList.remove('sidebar-open');
    if (this.refreshSubscription) {
      this.refreshSubscription.unsubscribe();
    }
    if (this.refreshNotificationsSub) {
      this.refreshNotificationsSub.unsubscribe();
    }
  }

  private loadUserDetails(): void {
    this.firstname = this.authService.getFirstName() || 'Guest';
    this.lastname = this.authService.getLastName() || 'Guest';
    this.role = this.authService.getRole() || 'Unknown Role';
  }

  private loadPendingItemsCount(): void {
    const userRole = this.role?.toLowerCase();
    const storeRoles = ['vhf', 'hf', 'sparepart', 'electronics'];
    
    if (!storeRoles.includes(userRole)) {
      this.pendingItemsCount = 0;
      return;
    }
    
    this.transitService.getReceivedItems().subscribe({
      next: (items) => {
        // Count only items with "Waiting For Stores" status for this store
        this.pendingItemsCount = items.filter(item => {
          const isForThisStore = (item.storeType || '').toLowerCase() === userRole;
          const isWaitingStatus = item.status === 'Waiting For Stores';
          
          // Check if main item is waiting for this store
          if (isForThisStore && isWaitingStatus) {
            return true;
          }
          
          // Check if any extra items are waiting for this store
          const hasWaitingExtraItems = (item.extraItems ?? []).some(extra => 
            (extra.store || '').toLowerCase() === userRole && 
            extra.extraStatus === 'Waiting For Stores'
          );
          
          return hasWaitingExtraItems;
        }).length;
      },
      error: () => {
        this.pendingItemsCount = 0;
      }
    });
  }

  private loadPendingSparePartsCount(): void {
    const role = this.role?.toUpperCase();
    const teamLeaderRoles = ['PTEAM_LEADER', 'OTEAM_LEADER', 'VTEAM_LEADER', 'HTEAM_LEADER', 'RTEAM_LEADER', 'MAINTENANCE_LEADER', 'MINISTORE'];
    
    if (!teamLeaderRoles.includes(role)) {
      this.pendingSparePartsCount = 0;
      return;
    }

    const url = `${environment.apiBaseUrl}/api/SparePartsRequest/all`;
    this.http.get<any[]>(url).subscribe({
      next: (data: any[]) => {
        const normalizedData = data.map((item: any) => ({
          ...item,
          requestedBy: item.requestedBy ?? item.RequestedBy,
          requestType: item.requestType ?? item.RequestType,
          currentStage: item.currentStage ?? item.CurrentStage,
          status: item.status ?? item.Status
        }));

        this.pendingSparePartsCount = normalizedData.filter((req: any) => {
          // If the request has an approval date, is marked as issued, or is completed, it's no longer pending
          const status = (req.status || '').toLowerCase();
          const stage = (req.currentStage || '').toUpperCase();
          const isIssued = status.includes('issued');
          const isResponded = !!req.approvalDate || !!req.ApprovalDate;
          const isCompleted = stage === 'COMPLETED';

          if (isIssued || isResponded || isCompleted) {
            return false;
          }

          switch (role) {
            case 'PTEAM_LEADER':
              return req.requestType === 'POWER' && req.currentStage === 'PTEAM_LEADER';
            case 'OTEAM_LEADER':
              return req.requestType === 'OFFICE_MACHINE' && req.currentStage === 'OTEAM_LEADER';
            case 'VTEAM_LEADER':
              return req.requestType === 'VHF_RADIO' && req.currentStage === 'VTEAM_LEADER';
            case 'HTEAM_LEADER':
              return req.requestType === 'HF_RADIO' && req.currentStage === 'HTEAM_LEADER';
            case 'RTEAM_LEADER':
              return req.requestType === 'RADIO_MAINTENANCE' && req.currentStage === 'RTEAM_LEADER';
            case 'MAINTENANCE_LEADER':
              return (
                ['PTEAM_LEADER', 'OTEAM_LEADER', 'RTEAM_LEADER', 'VTEAM_LEADER', 'HTEAM_LEADER']
                  .includes(req.requestedBy) &&
                req.currentStage === 'MAINTENANCE_LEADER'
              );
            case 'MINISTORE':
              return req.currentStage === 'MINISTORE';
            default:
              return false;
          }
        }).length;
      },
      error: () => {
        this.pendingSparePartsCount = 0;
      }
    });
  }

  /** Counts spare parts that were issued to this technician/team-leader but not yet seen */
  private loadSparePartIssuedCount(): void {
    const role = this.role?.trim().toUpperCase();

    // Technician roles and their team leaders
    const techRoles = [
      'POWER', 'POWER_MAINTENANCE',
      'OFFICE_MACHINE', 'OFFICE_MACHINE_MAINTENANCE', 'IT_MAINTENANCE',
      'VHF_RADIO', 'VHF_MAINTENANCE',
      'HF_RADIO', 'HF_MAINTENANCE',
      'RADIO_MAINTENANCE', 'COMPUTER_MAINTENANCE',
      'PTEAM_LEADER', 'OTEAM_LEADER', 'VTEAM_LEADER', 'HTEAM_LEADER', 'RTEAM_LEADER',
      'ELECTRICAL_MAINTENANCE', 'MECHANICAL_MAINTENANCE', 'WELDING_MAINTENANCE'
    ];

    if (!techRoles.includes(role)) {
      this.sparePartIssuedCount = 0;
      return;
    }

    // Map role → requestType values that belong to this role
    const roleToRequestTypes: Record<string, string[]> = {
      'POWER':                      ['POWER'],
      'POWER_MAINTENANCE':          ['POWER'],
      'ELECTRICAL_MAINTENANCE':     ['POWER'],
      'MECHANICAL_MAINTENANCE':     ['POWER'],
      'WELDING_MAINTENANCE':        ['POWER'],
      'PTEAM_LEADER':               ['POWER'],
      'OFFICE_MACHINE':             ['OFFICE_MACHINE'],
      'OFFICE_MACHINE_MAINTENANCE': ['OFFICE_MACHINE'],
      'IT_MAINTENANCE':             ['OFFICE_MACHINE'],
      'OTEAM_LEADER':               ['OFFICE_MACHINE'],
      'VHF_RADIO':                  ['VHF_RADIO'],
      'VHF_MAINTENANCE':            ['VHF_RADIO'],
      'VTEAM_LEADER':               ['VHF_RADIO'],
      'HF_RADIO':                   ['HF_RADIO'],
      'HF_MAINTENANCE':             ['HF_RADIO'],
      'HTEAM_LEADER':               ['HF_RADIO'],
      'RADIO_MAINTENANCE':          ['RADIO_MAINTENANCE', 'VHF_RADIO', 'HF_RADIO'],
      'RTEAM_LEADER':               ['RADIO_MAINTENANCE', 'VHF_RADIO', 'HF_RADIO'],
      'COMPUTER_MAINTENANCE':       ['OFFICE_MACHINE'],
    };

    const myRequestTypes = roleToRequestTypes[role] ?? [];
    if (!myRequestTypes.length) {
      this.sparePartIssuedCount = 0;
      return;
    }

    const seenIds = this.getSeenIds();

    this.http.get<any[]>(`${environment.apiBaseUrl}/api/SparePartsRequest/all`).subscribe({
      next: (data) => {
        const issued = data.filter(req => {
          const status = (req.status ?? req.Status ?? '').toLowerCase();
          const reqType = (req.requestType ?? req.RequestType ?? '').toUpperCase();
          const id = req.id ?? req.Id;
          return (
            status === 'issued to technician' &&
            myRequestTypes.includes(reqType) &&
            !seenIds.has(id)
          );
        });
        this.sparePartIssuedCount = issued.length;
      },
      error: () => { this.sparePartIssuedCount = 0; }
    });
  }

  private loadUndeliveredMaintainedCount(): void {
    const role = this.role?.trim().toUpperCase();
    if (role !== 'PPC' && role !== 'MAINTENANCE_LEADER' && role !== 'QUALITY') {
      this.undeliveredMaintainedCount = 0;
      return;
    }

    const url = `${environment.apiBaseUrl}/api/MaintenanceRequestRegister`;
    this.http.get<any[]>(url).subscribe({
      next: (data) => {
        // Items ready for delivery but not yet delivered
        const undelivered = data.filter(r => 
          ['Maintenance Finished', 'Do Out'].includes(r.status)
        );
        this.undeliveredMaintainedCount = undelivered.length;
      },
      error: () => { this.undeliveredMaintainedCount = 0; }
    });
  }

  /** Returns the set of spare-part request IDs already seen by this user */
  private getSeenIds(): Set<number> {
    try {
      const raw = localStorage.getItem(this.SEEN_KEY);
      return raw ? new Set<number>(JSON.parse(raw)) : new Set<number>();
    } catch {
      return new Set<number>();
    }
  }

  /** Marks all currently-issued spare parts as seen and resets the badge */
  markSparePartsAsSeen(): void {
    const role = this.role?.trim().toUpperCase();
    const roleToRequestTypes: Record<string, string[]> = {
      'POWER':                      ['POWER'],
      'POWER_MAINTENANCE':          ['POWER'],
      'PTEAM_LEADER':               ['POWER'],
      'OFFICE_MACHINE':             ['OFFICE_MACHINE'],
      'OFFICE_MACHINE_MAINTENANCE': ['OFFICE_MACHINE'],
      'IT_MAINTENANCE':             ['OFFICE_MACHINE'],
      'OTEAM_LEADER':               ['OFFICE_MACHINE'],
      'VHF_RADIO':                  ['VHF_RADIO'],
      'VHF_MAINTENANCE':            ['VHF_RADIO'],
      'VTEAM_LEADER':               ['VHF_RADIO'],
      'HF_RADIO':                   ['HF_RADIO'],
      'HF_MAINTENANCE':             ['HF_RADIO'],
      'HTEAM_LEADER':               ['HF_RADIO'],
      'RADIO_MAINTENANCE':          ['RADIO_MAINTENANCE', 'VHF_RADIO', 'HF_RADIO'],
      'RTEAM_LEADER':               ['RADIO_MAINTENANCE', 'VHF_RADIO', 'HF_RADIO'],
      'COMPUTER_MAINTENANCE':       ['OFFICE_MACHINE'],
    };
    const myRequestTypes = roleToRequestTypes[role] ?? [];

    this.http.get<any[]>(`${environment.apiBaseUrl}/api/SparePartsRequest/all`).subscribe({
      next: (data) => {
        const seenIds = this.getSeenIds();
        data.forEach(req => {
          const status = (req.status ?? req.Status ?? '').toLowerCase();
          const reqType = (req.requestType ?? req.RequestType ?? '').toUpperCase();
          const id = req.id ?? req.Id;
          if (status === 'issued to technician' && myRequestTypes.includes(reqType)) {
            seenIds.add(id);
          }
        });
        localStorage.setItem(this.SEEN_KEY, JSON.stringify([...seenIds]));
        this.sparePartIssuedCount = 0;
      },
      error: () => {}
    });
  }

  private loadPendingAssignmentsCount(): void {
    const role = this.role?.trim().toUpperCase();

    // Only for technician roles
    const techRoles = [
      'POWER', 'POWER_MAINTENANCE',
      'OFFICE_MACHINE', 'OFFICE_MACHINE_MAINTENANCE',
      'VHF_RADIO', 'VHF_MAINTENANCE',
      'HF_RADIO', 'HF_MAINTENANCE',
      'RADIO_MAINTENANCE', 'IT_MAINTENANCE', 'COMPUTER_MAINTENANCE',
      'ELECTRICAL_MAINTENANCE', 'MECHANICAL_MAINTENANCE', 'WELDING_MAINTENANCE'
    ];
    if (!techRoles.includes(role)) {
      this.pendingAssignmentsCount = 0;
      return;
    }

    // Map role to the requestedTo value set by the team leader when assigning
    const requestedToMap: Record<string, string> = {
      'POWER':                      'Power Maintenance',
      'POWER_MAINTENANCE':          'Power Maintenance',
      'ELECTRICAL_MAINTENANCE':     'Electrical Maintenance',
      'MECHANICAL_MAINTENANCE':     'Mechanical Maintenance',
      'WELDING_MAINTENANCE':        'Welding Maintenance',
      'OFFICE_MACHINE':             'Office_Machine Maintenance',
      'OFFICE_MACHINE_MAINTENANCE': 'Office_Machine Maintenance',
      'VHF_RADIO':                  'VHF_Radio Maintenance',
      'VHF_MAINTENANCE':            'VHF_Radio Maintenance',
      'HF_RADIO':                   'HF_Radio Maintenance',
      'HF_MAINTENANCE':             'HF_Radio Maintenance',
      'RADIO_MAINTENANCE':          'RADIO_MAINTENANCE Maintenance',
      'IT_MAINTENANCE':             'Computer_Maintenance',
      'COMPUTER_MAINTENANCE':       'Computer_Maintenance'
    };
    const requestedTo = requestedToMap[role];

    this.http.get<any[]>(`${environment.apiBaseUrl}/api/MaintenanceRequestRegister`).subscribe({
      next: (data) => {
        this.pendingAssignmentsCount = data.filter(r =>
          r.requestedTo === requestedTo &&
          r.status === 'On Maintaining'
        ).length;
      },
      error: () => { this.pendingAssignmentsCount = 0; }
    });
  }

  private loadDoOutCount(): void {
    const role = this.role?.trim().toUpperCase();
    
    this.http.get<any[]>(`${environment.apiBaseUrl}/api/MaintenanceRequestRegister/status/do-out`).subscribe({
      next: (data) => {
        const isManager = ['MAINTENANCE_LEADER', 'PPC', 'SUPER_ADMIN', 'MAINTENANCE_ADMIN'].includes(role);
        
        if (isManager) {
          this.doOutCount = data.length;
        } else {
          // Filtering logic for technicians (similar to DoOutComponent)
          const roleMap: { [key: string]: string[] } = {
            'POWER': ['POWER'],
            'POWER_MAINTENANCE': ['POWER'],
            'ELECTRICAL_MAINTENANCE': ['POWER'],
            'MECHANICAL_MAINTENANCE': ['POWER'],
            'WELDING_MAINTENANCE': ['POWER'],
            'PTEAM_LEADER': ['POWER'],
            'OFFICE_MACHINE': ['OFFICE_MACHINE'],
            'OFFICE_MACHINE_MAINTENANCE': ['OFFICE_MACHINE'],
            'IT_MAINTENANCE': ['OFFICE_MACHINE'],
            'COMPUTER_MAINTENANCE': ['OFFICE_MACHINE', 'COMPUTER_MAINTENANCE'],
            'OTEAM_LEADER': ['OFFICE_MACHINE', 'COMPUTER_MAINTENANCE'],
            'RADIO_MAINTENANCE': ['RADIO_MAINTENANCE', 'VHF_RADIO', 'HF_RADIO'],
            'RTEAM_LEADER': ['RADIO_MAINTENANCE', 'VHF_RADIO', 'HF_RADIO'],
            'VHF_RADIO': ['VHF_RADIO', 'RADIO_MAINTENANCE'],
            'VHF_MAINTENANCE': ['VHF_RADIO', 'RADIO_MAINTENANCE'],
            'VTEAM_LEADER': ['VHF_RADIO', 'RADIO_MAINTENANCE'],
            'HF_RADIO': ['HF_RADIO', 'RADIO_MAINTENANCE'],
            'HF_MAINTENANCE': ['HF_RADIO', 'RADIO_MAINTENANCE'],
            'HTEAM_LEADER': ['HF_RADIO', 'RADIO_MAINTENANCE']
          };
          
          const targetTypes = roleMap[role] || [];
          this.doOutCount = data.filter(req => {
            const mType = req.maintenanceType?.toUpperCase().trim();
            const sStage = req.statusStage?.toUpperCase().trim();
            return targetTypes.some(type => 
              mType === type.toUpperCase() || sStage === type.toUpperCase()
            );
          }).length;
        }
      },
      error: () => { this.doOutCount = 0; }
    });
  }

  private loadPendingMaintRequestsCount(): void {
    const role = this.role?.trim().toUpperCase();
    const teamLeaderRoles = ['PTEAM_LEADER', 'OTEAM_LEADER', 'RTEAM_LEADER', 'VTEAM_LEADER', 'HTEAM_LEADER', 'POWER_MAINTENANCE', 'OFFICE_MACHINE_MAINTENANCE', 'RADIO_MAINTENANCE', 'COMPUTER_MAINTENANCE', 'VHF_MAINTENANCE', 'HF_MAINTENANCE', 'IT_MAINTENANCE'];
    
    if (!teamLeaderRoles.includes(role)) {
      this.pendingMaintRequestsCount = 0;
      return;
    }

    const maintenanceTypeMap: Record<string, string> = {
      PTEAM_LEADER: 'Power',
      POWER_MAINTENANCE: 'Power',
      OTEAM_LEADER: 'Office_Machine',
      OFFICE_MACHINE_MAINTENANCE: 'Office_Machine',
      IT_MAINTENANCE: 'Office_Machine',
      COMPUTER_MAINTENANCE: 'Office_Machine',
      RTEAM_LEADER: 'RADIO_MAINTENANCE',
      RADIO_MAINTENANCE: 'RADIO_MAINTENANCE'
    };

    const requestedToMap: Record<string, string> = {
      VTEAM_LEADER: 'VHF_Radio Maintenance',
      VHF_MAINTENANCE: 'VHF_Radio Maintenance',
      VHF_RADIO: 'VHF_Radio Maintenance',
      HTEAM_LEADER: 'HF_Radio Maintenance',
      HF_MAINTENANCE: 'HF_Radio Maintenance',
      HF_RADIO: 'HF_Radio Maintenance',
      COMPUTER_MAINTENANCE: 'Computer_Maintenance',
      RADIO_MAINTENANCE: 'RADIO_MAINTENANCE Maintenance'
    };

    const maintenanceType = maintenanceTypeMap[role] || '';
    const requestedTo = requestedToMap[role] || '';

    this.http.get<any[]>(`${environment.apiBaseUrl}/api/MaintenanceRequestRegister`).subscribe({
      next: (data) => {
        this.pendingMaintRequestsCount = data.filter(req => {
          const status = req.status || 'Pending';
          const isPending = status === 'Pending' || status === 'Waiting for Approval';
          
          if (!isPending) return false;

          const mType = req.maintenanceType || '';
          const rTo = req.requestedTo || '';

          if (maintenanceType && mType === maintenanceType) return true;
          if (requestedTo && rTo === requestedTo) return true;
          
          // Special cases for team leaders who see all in their category
          if (role === 'PTEAM_LEADER' && mType === 'Power') return true;
          if (role === 'OTEAM_LEADER' && mType === 'Office_Machine') return true;
          if (role === 'RTEAM_LEADER' && (mType === 'RADIO_MAINTENANCE' || rTo.includes('VHF') || rTo.includes('HF'))) return true;

          return false;
        }).length;
      },
      error: () => { this.pendingMaintRequestsCount = 0; }
    });
  }

  private loadPendingLettersCount(): void {
    // Only load for PPC role
    if (this.role?.trim().toUpperCase() !== 'PPC') {
      this.pendingLettersCount = 0;
      return;
    }
    
    // Use getInitialLetters which returns only letters with "Initial" status
    this.maintenanceRequestService.getInitialLetters().subscribe({
      next: (letters) => {
        this.pendingLettersCount = letters.length;
        console.log('Pending letters count:', this.pendingLettersCount); // Debug log
      },
      error: (err) => {
        console.error('Error loading pending letters:', err);
        this.pendingLettersCount = 0;
      }
    });
  }

  get filteredMenuItems(): MenuItem[] {
    return this.menuItems
      .filter(item => item.roles.includes(this.role) && !item.hideLabel); // Exclude items with hideLabel: true
  }

  isSidebarVisible(route: string): boolean {
    const allRoutes = this.menuItems.map(item => item.link);
    return allRoutes.some(r => this.matchRoute(route, r));
  }

  matchRoute(actualRoute: string, patternRoute: string): boolean {
    const regexPattern = new RegExp('^' + patternRoute.replace(/:id/, '[^/]+') + '(\/[^\/]+)?$');
    return regexPattern.test(actualRoute);
  }

  normalizeRoute(route: string): string {
    return route.split('?')[0].split('#')[0];
  }

  private updateBodyClass(): void {
    if (this.showSidebar) {
      document.body.classList.add('sidebar-open');
    } else {
      document.body.classList.remove('sidebar-open');
    }
  }

  onLogout(): void {
    console.log('Initiating logout...');
    this.authService.logout().subscribe({
      next: () => {
        console.log('Logout successful, redirecting to login...');
        this.router.navigate(['/login'], { replaceUrl: true });
        this.showSidebar = false;
        this.updateBodyClass();
      },
      error: (error) => {
        console.error('Error during logout:', error);
        // Still redirect to login even if there's an error
        this.router.navigate(['/login'], { replaceUrl: true });
        this.showSidebar = false;
        this.updateBodyClass();
      }
    });
  }

  toggleSidebar(): void {
    this.showSidebar = !this.showSidebar;
    this.sidebarToggle.emit(this.showSidebar);
    this.updateBodyClass();
  }

  onNavigate(): void {
    // Refresh counts when navigating to specific pages
    const currentRoute = this.router.url;
    if (currentRoute.includes('/maintenance/request-form')) {
      // Refresh letter count when navigating to the form
      setTimeout(() => this.loadPendingLettersCount(), 500);
    }

    // Clear the "spare parts issued" badge when the user visits the given spare parts page
    if (currentRoute.includes('/maintenance/givenSparesto')) {
      this.markSparePartsAsSeen();
    }
    
    // Close sidebar after navigation
    this.showSidebar = false;
    this.sidebarToggle.emit(false);
    this.updateBodyClass();
  }
}