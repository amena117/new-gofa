import { Component, OnInit, OnDestroy, Output, EventEmitter } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';

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
  

  menuItems: MenuItem[] = [
    // VHF, HF, SPAREPART, ELECTRONICS Roles
    { label: 'Store Dashboard / የስቶር ዳሽቦርድ', link: '/inventory-summary', roles: ['VHF', 'HF', 'SPAREPART', 'ELECTRONICS'] },
    { label: 'Team Leader Dashboard / የቡድን መሪ ዳሽቦርድ', link: '/team-leader-dashboard', roles: ['SUPPLY_AND_DISTRIBUTION_TEAMLEADER']},
    { label: 'Items / የእቃ ዝርዝር', link: '/items', roles: ['VHF', 'HF', 'SPAREPART', 'ELECTRONICS', 'SUPPLY_AND_DISTRIBUTION_TEAMLEADER'] },
    { label: 'Register Item / እቃ ምዝገባ', link: '/register-item', roles: ['VHF', 'HF', 'SPAREPART', 'ELECTRONICS'] },
    { label: 'Existing Item / ነባር እቃ ገቢ ', link: '/add-item-quantity', roles: ['VHF', 'HF', 'SPAREPART', 'ELECTRONICS'] },
    { label: 'Model22 Registration / ሞዴል 22 መዝግብ', link: 'model22register', roles: ['VHF', 'HF', 'SPAREPART', 'ELECTRONICS'] },
    { label: 'Received item report / የገቢ ሪፖርት', link: '/transaction-report', roles: ['VHF', 'HF', 'SPAREPART', 'ELECTRONICS', 'SUPPLY_AND_DISTRIBUTION_TEAMLEADER'] },
    { label: 'Model22 Report / ሞዴል 22 ሪፖርት', link: '/model22-list', roles: ['VHF', 'HF', 'SPAREPART', 'ELECTRONICS', 'SUPPLY_AND_DISTRIBUTION_TEAMLEADER', 'PROPERTY_CONTROL'] },
    
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

    
     { label: 'Dashboard', link: '/MasterCard/dashboard', roles: ['PROPERTY_CONTROL'] },
    { label: 'Mastercard List / ማስተርካርድ ዝርዝር', link: '/MasterCard/mastercard-list', roles: ['PROPERTY_CONTROL'] },
    { label: 'Mastercard Form / ማስተርካርድ ቅጽ', link: '/MasterCard/mastercard-form', roles: ['PROPERTY_CONTROL'] },
    { label: 'Mastercard Report /ማስተርካርድ ሪፖርት', link: 'MasterCard/report', roles: ['PROPERTY_CONTROL'] },

    { label: 'Model 2 / ሞዴል ሁለት', link: '/MasterCard/request-order-for-issue', roles: ['PROPERTY_CONTROL'] },
    { label: 'Model 2 list / ሞዴል ሁለት ዝርዝሮች', link: '/MasterCard/request-roder-list', roles: ['PROPERTY_CONTROL'] },

    { 
      label: 'details', 
      link: '/ /MasterCard/master-card-details/:id', 
      roles: ['PROPERTY_CONTROL'], 
      hideLabel: true // Hide this label in the sidebar
    },
    { 
      label: 'Model 2 report/ ሞዴል ሁለት ሪፖርት ', 
      link: '/MasterCard/request-order/report', 
      roles: ['PROPERTY_CONTROL'], 
     
    },


    
    // TRANSIT Role
    { label: 'MODEL 1 / ሞዴል 1', link: '/transit/received-items', roles: ['TRANSIT', 'PROPERTY_CONTROL'] },
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
    
    
    
// { label: 'Dashboard', link: '/maintenance/dashboard', roles: ['PPC', 'QUALITY']},
{ label: 'የሜንቴናንስ ጥያቄ ይመዝግቡ', link: '/maintenance/request-form', roles: ['PPC'] },
{ label: 'ለሜንቴናንስ ክፍሎች ይላኩ', link: '/maintenance/request-list', roles: ['PPC'] },
{ label: 'ለደንበኞች ይሰረክቡ', link: '/maintenance/Give-maintainedEqupment', roles: ['PPC', 'QUALITY'] },
{ label: 'የተጠገኑ መረጃ ይመልከቱ', link: '/maintenance/view-client-data', roles: ['PPC', 'MAINTENANCE_LEADER'] },
{ label: 'ሁሉም ጥያቄዎች ይመልከቱ', link: '/maintenance/MRRListAll', roles: ['PPC', 'MAINTENANCE_LEADER'] },
{ label: 'የንብረቶችን ሞደል ይመዝግቡ', link: '/maintenance/equipmentadd', roles: ['PPC'] },
{ label: 'የሞዴሎችን ዝርዝር ይመልከቱ', link: '/maintenance/equipments', roles: ['PPC']},  



//POWER
{ label: 'የሜንቴናንስ ጥያቄዎች ዝርዝር', link: '/maintenance/power-maintReqList', roles: ['POWER', 'OFFICE_MACHINE', 'RADIO_MAINTENANCE', 'PTEAM_LEADER', 'RTEAM_LEADER', 'OTEAM_LEADER'] },
{ label: 'የተሰጡ የስፓርፓርቶች', link: '/maintenance/givenSparesto', roles: ['POWER', 'OFFICE_MACHINE', 'RADIO_MAINTENANCE', 'PTEAM_LEADER','HTEAM_LEADER', 'RTEAM_LEADER', 'OTEAM_LEADER'] },
{ label: 'የተጠገኑ ዝርዝሮች ', link: '/maintenance/Give-maintainedEqupment', roles: ['POWER', 'OFFICE_MACHINE', 'RADIO_MAINTENANCE','PTEAM_LEADER', 'RTEAM_LEADER', 'OTEAM_LEADER'] },
{ label: 'ሁሉም ጥያቄዎች', link: '/maintenance/MRRListAll', roles: ['POWER', 'OFFICE_MACHINE', 'RADIO_MAINTENANCE'] },

//MINISTORE
{ label: 'ደብዳቤ ይቀበሉ', link: '/maintenance/Add_Letter', roles: ['MAINTENANCE_LEADER']},
{ label: 'የስፓርፓርቶች ጥያቄዎች', link: '/maintenance/spare-parts-requests', roles: ['MINISTORE', 'MAINTENANCE_LEADER', 'OTEAM_LEADER', 'PTEAM_LEADER', 'RTEAM_LEADER'] },
{ label: 'የስፓርፓርቶች ዋጋ', link: '/maintenance/spare-parts-respond', roles: ['MINISTORE'] },
{ label: 'የትውስት መሳሪያ ያስገቡ ', link: '/maintenance/special-toolss/add', roles: ['MINISTORE'] },
{ label: 'የትውስት መሳሪያዎች መረጃ', link: '/maintenance/special-tools', roles: ['MINISTORE', 'MAINTENANCE_LEADER'] },
{ label: 'ቢንካርድ ያስገቡ ', link: '/maintenance/addministorebincard', roles: ['MINISTORE'] },
{ label: 'ቢንካርድ ይመልከቱ ', link: '/maintenance/bincard-list', roles: ['MINISTORE', 'MAINTENANCE_LEADER'] },
{ label: 'ፓርት ነምበር  ዝርዝሮች ', link: '/maintenance/view-serials', roles: ['MINISTORE','MAINTENANCE_LEADER'] },
{ label: 'የፓርት ነምበር ሪፖርት', link: '/maintenance/report-ministore', roles: ['MINISTORE', 'MAINTENANCE_LEADER']},
// { label: 'ቢንካርድ መደመር ', link: '/maintenance/receive-spare-form-12', roles: ['MINISTORE'] },

{ label: 'ሪፖርት ፊጠር', link: '/maintenance/generate-report', roles: ['PPC','MAINTENANCE_LEADER', 'OTEAM_LEADER', 
  'PTEAM_LEADER', 'RTEAM_LEADER', 'QUALITY',
  'POWER', 'OFFICE_MACHINE', 'RADIO_MAINTENANCE'
] },
 { label: 'የሜንቴናንስ ደብዳቤዎች', link: '/maintenance/letter_fetch', roles: ['MAINTENANCE_LEADER'] },
//{ label: 'update/:id', link: '/maintenance/update/:id', roles: ['MINISTORE']},
  { label: 'Do Out ዝርዝር', link: '/maintenance/doOut', roles: ['PPC','MAINTENANCE_LEADER', 'OTEAM_LEADER', 
  'PTEAM_LEADER', 'RTEAM_LEADER', 'QUALITY',
  'POWER', 'OFFICE_MACHINE', 'RADIO_MAINTENANCE'
] },]

  
  
  
  
  
  
  
  

  constructor(private router: Router, private authService: AuthService) {}

  ngOnInit(): void {
    this.loadUserDetails();
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe(() => {
        const currentRoute = this.normalizeRoute(this.router.url);
        this.isLoginPage = currentRoute === '/login';
        
        if (this.isLoginPage) {
          this.showSidebar = false;
          this.sidebarToggle.emit(false);
        } else {
          const isAuthenticated = this.authService.isAuthenticated();
          this.showSidebar = isAuthenticated && this.isSidebarVisible(currentRoute);
          this.sidebarToggle.emit(this.showSidebar);
        }
        
        this.updateBodyClass();
        this.loadUserDetails();
      });

    // Check screen size on init
    if (window.innerWidth <= 768) {
      this.showSidebar = false;
      this.sidebarToggle.emit(false);
    }
  }

  ngOnDestroy(): void {
    document.body.classList.remove('sidebar-open');
  }

  private loadUserDetails(): void {
    this.firstname = this.authService.getFirstName() || 'Guest';
    this.lastname = this.authService.getLastName() || 'Guest';
    this.role = this.authService.getRole() || 'Unknown Role';
    
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
}