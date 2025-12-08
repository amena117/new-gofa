import { Component, HostListener, OnInit } from '@angular/core';
import { Router, NavigationEnd, NavigationStart, ActivationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  title = 'gofaFrontend';
  isSidebarOpen = true;
  isLoginPage = false;

  constructor(
    private router: Router,
    private http: HttpClient
  ) {}

  ngOnInit() {
    // Set initial isLoginPage based on current URL
    this.isLoginPage = this.normalizeRoute(this.router.url) === '/login';
    if (this.isLoginPage) {
      this.isSidebarOpen = false;
      document.body.classList.remove('sidebar-open');
    } else {
      this.isSidebarOpen = true;
      document.body.classList.add('sidebar-open');
    }

    // Subscribe to route changes
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd || event instanceof ActivationEnd)
    ).subscribe(event => {
      this.isLoginPage = this.normalizeRoute(this.router.url) === '/login';
      console.log('isLoginPage:', this.isLoginPage, 'URL:', this.router.url); // Debug log
      if (this.isLoginPage) {
        this.isSidebarOpen = false;
        document.body.classList.remove('sidebar-open');
      } else {
        this.isSidebarOpen = true;
        document.body.classList.add('sidebar-open');
      }
    });
  }

  private normalizeRoute(route: string): string {
    return route.split('?')[0].split('#')[0];
  }

  @HostListener('window:resize', ['$event'])
  onResize() {
    if (window.innerWidth <= 768) {
      this.isSidebarOpen = false;
      document.body.classList.remove('sidebar-open');
    } else if (!this.isLoginPage) {
      this.isSidebarOpen = true;
      document.body.classList.add('sidebar-open');
    }
  }

  onSidebarToggle(isOpen: boolean) {
    if (!this.isLoginPage) {
      this.isSidebarOpen = isOpen;
      if (isOpen) {
        document.body.classList.add('sidebar-open');
      } else {
        document.body.classList.remove('sidebar-open');
      }
    }
  }
}