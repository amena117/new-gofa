import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment'; // ✅ Import environment config

@Component({
  selector: 'app-etter-registration',
  templateUrl: './etter-registration.component.html',
  styleUrls: ['./etter-registration.component.css']
})
export class EtterRegistrationComponent {
  etter = {
    from: '',
    recommendBy: '',
    status: 'initial'
  };

  successMessage = '';

  constructor(private http: HttpClient) {}

  onSubmit(form: any) {
    const apiUrl = `${environment.apiBaseUrl}/api/LetterRegistration`; // ✅ Use environment variable

    this.http.post(apiUrl, this.etter).subscribe({
      next: () => {
        this.successMessage = 'Letter registered successfully!';
        form.resetForm({
          from: '',
          recommendBy: '',
          status: 'initial'
        });
      },
      error: (err) => {
        console.error('Error submitting letter', err);
      }
    });
  }
}
