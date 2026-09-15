import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { Subscription } from 'rxjs';

interface Tab {
  route: string;
  title: string;
}

@Component({
  selector: 'app-page-history-tabs',
  templateUrl: './page-history-tabs.component.html',
  styleUrls: ['./page-history-tabs.component.scss']
})
export class PageHistoryTabsComponent implements OnInit, OnDestroy {
  tabs: Tab[] = [];
  activeRoute: string = '';
  private routerSub!: Subscription;
  private readonly STORAGE_KEY = 'gofa_open_tabs';
  private readonly MAX_TABS = 10;
  
  // Clean page titles mapping
  private routeTitles: { [key: string]: string } = {
    '/dashboard': 'Dashboard',
    '/register-item': 'Register Item',
    '/items': 'Items',
    '/accessories': 'Accessories',
    '/accessory-withdrawal': 'Accessory Withdrawal',
    '/item-transaction-history': 'Transaction History',
    '/add-item-quantity': 'Add Item Quantity',
    '/inventory-summary': 'Inventory Summary',
    '/from-transit': 'From Transit',
    '/shelf': 'Shelf',
    '/shelves': 'Shelves',
    '/warehouse': 'Warehouse',
    '/warehouses': 'Warehouses',
    '/item-types': 'Item Types',
    '/transaction-report': 'Transaction Report',
    '/admin-dashboard': 'Admin Dashboard',
    '/users': 'Users',
    '/team-leader-dashboard': 'Leader Dashboard',
    '/user-performance': 'User Performance',
    '/transit/receive-item-form': 'Receive Item Form',
    '/transit-root': 'Transit Root',
    '/transit/received-items': 'Received Items',
    '/transit/sent-for-inspection': 'Sent For Inspection',
    '/transit/inspected-items': 'Inspected Items',
    '/transit/send-to-store': 'Send To Store',
    '/transit/model2-list': 'Model 2 List',
    '/transit/model2-add': 'Model 2 Add',
    '/transit/model1-report': 'Model 1 Report',
    '/MasterCard/mastercard-list': 'Mastercard List',
    '/MasterCard/mastercard-form': 'Mastercard Form',
    '/MasterCard/dashboard': 'Dashboard',
    '/MasterCard/request-order-for-issue': 'Request Order For Issue',
    '/MasterCard/request-roder-list': 'Request Order List',
    '/MasterCard/report': 'Mastercard Report',
    '/MasterCard/request-order/report': 'Request Orders Report',
    '/model22report': 'Model 22 Report',
    '/model22register': 'Model 22 Register',
    '/model22-list': 'Model 22 List',
    '/item-distribution-report': 'Item Distribution Report'
  };

  constructor(private router: Router) {}

  ngOnInit(): void {
    console.log('[PageHistoryTabs] ngOnInit called, current url:', this.router.url);
    this.loadTabs();
    console.log('[PageHistoryTabs] loaded tabs from storage:', this.tabs);
    
    this.routerSub = this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: any) => {
      console.log('[PageHistoryTabs] NavigationEnd:', event.urlAfterRedirects);
      this.handleRouteChanged(event.urlAfterRedirects);
    });
    
    // Handle initial load
    this.handleRouteChanged(this.router.url);
  }

  ngOnDestroy(): void {
    if (this.routerSub) {
      this.routerSub.unsubscribe();
    }
  }

  private loadTabs(): void {
    const saved = localStorage.getItem(this.STORAGE_KEY);
    if (saved) {
      try {
        this.tabs = JSON.parse(saved);
      } catch (e) {
        this.tabs = [];
      }
    }
  }

  private saveTabs(): void {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.tabs));
  }

  private normalizeRoute(route: string): string {
    return route.split('?')[0].split('#')[0];
  }

  private getTitleForRoute(route: string): string {
    const norm = this.normalizeRoute(route);
    
    // Check exact match
    if (this.routeTitles[norm]) {
      return this.routeTitles[norm];
    }
    
    // Handle dynamic routes like /item/123 or /MasterCard/mastercard-edit/123
    if (norm.startsWith('/item/')) return 'Item Details';
    if (norm.startsWith('/warehouses/edit/')) return 'Edit Warehouse';
    if (norm.startsWith('/transit/edit-item/')) return 'Edit Item';
    if (norm.startsWith('/transit/view-details/')) return 'View Details';
    if (norm.startsWith('/transit/model2-edit/')) return 'Model 2 Edit';
    if (norm.startsWith('/transit/model2-detail/')) return 'Model 2 Detail';
    if (norm.startsWith('/MasterCard/master-card-received/')) return 'Mastercard Received';
    if (norm.startsWith('/MasterCard/mastercard-edit/')) return 'Mastercard Edit';
    if (norm.startsWith('/MasterCard/master-card-issued/')) return 'Mastercard Issued';
    if (norm.startsWith('/MasterCard/master-card-details/')) return 'Mastercard Details';
    if (norm.startsWith('/MasterCard/request-order-detail/')) return 'Request Order Detail';
    if (norm.startsWith('/model22-detail/')) return 'Model 22 Detail';

    // Fallback title formatting
    const segments = norm.split('/').filter(s => s.length > 0);
    if (segments.length > 0) {
      const last = segments[segments.length - 1];
      return last.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    }
    
    return 'Page';
  }

  private handleRouteChanged(url: string): void {
    if (!url) return;
    const norm = this.normalizeRoute(url);
    console.log('[PageHistoryTabs] handleRouteChanged url:', url, 'norm:', norm);
    if (norm === '/login' || norm === '/register' || norm === '/unauthorized' || norm === '/') {
      console.log('[PageHistoryTabs] ignoring route:', norm);
      return;
    }

    this.activeRoute = norm;
    
    const existingIndex = this.tabs.findIndex(t => t.route === norm);
    if (existingIndex === -1) {
      console.log('[PageHistoryTabs] adding new tab for route:', norm);
      // Add new tab
      const title = this.getTitleForRoute(norm);
      this.tabs.push({ route: norm, title });
      
      // Enforce limits
      if (this.tabs.length > this.MAX_TABS) {
        // Remove oldest inactive tab
        const oldestInactiveIdx = this.tabs.findIndex(t => t.route !== this.activeRoute);
        if (oldestInactiveIdx !== -1) {
          this.tabs.splice(oldestInactiveIdx, 1);
        }
      }
      this.saveTabs();
    }
  }

  navigateToTab(route: string): void {
    this.router.navigateByUrl(route);
  }

  closeTab(event: MouseEvent, index: number): void {
    event.stopPropagation();
    
    const tabToClose = this.tabs[index];
    this.tabs.splice(index, 1);
    this.saveTabs();
    
    // If we closed the active tab, navigate to adjacent
    if (tabToClose.route === this.activeRoute) {
      if (this.tabs.length > 0) {
        // Try left, if not exist, try right (which is now at the same index)
        const nextIndex = index - 1 >= 0 ? index - 1 : 0;
        this.router.navigateByUrl(this.tabs[nextIndex].route);
      } else {
        this.router.navigate(['/dashboard']); // Fallback
      }
    }
  }
}
