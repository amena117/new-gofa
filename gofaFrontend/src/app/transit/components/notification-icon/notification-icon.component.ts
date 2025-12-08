// import { Component, OnInit } from '@angular/core';
// import { Router } from '@angular/router';
// import { TransitService } from '../../services/transit.service';
// import { Item } from '../../models/item.model';

// @Component({
//   selector: 'app-notification-icon',
//   templateUrl: './notification-icon.component.html',
//   styleUrl: './notification-icon.component.css'
// })
// export class NotificationIconComponent implements OnInit {
//   hasNewItems: boolean = false;
//   constructor(private transitService: TransitService, private router: Router) {}


//   ngOnInit() {
//     this.transitService.getInspectedItems().subscribe((items) => {
//       this.hasNewItems = items.some((item) => item.Status === 'Received by Inspection Unit');
//     });
//   }

//   onNotificationClick() {
//     if (this.hasNewItems) {
//       this.router.navigate(['/inspected-items']);
//     }
//   }
// }


import { Component, OnInit } from '@angular/core';
import { TransitService } from '../../services/transit.service';
import { Item } from '../../models/item.model';

@Component({
  selector: 'app-notification-icon',
  templateUrl: './notification-icon.component.html',
  styleUrls: ['./notification-icon.component.css'],
})
export class NotificationIconComponent implements OnInit {
  hasNewItems: boolean = false;

  constructor(private transitService: TransitService) {}

  ngOnInit() {
    this.transitService.getNotifications().subscribe((items) => {
      this.hasNewItems = items.some((item) => item.status === 'Received by Inspection Unit');
    });
  }
  onNotificationClick() {
        if (this.hasNewItems) {
          // this.router.navigate(['/inspected-items']);
        }
      }
}
