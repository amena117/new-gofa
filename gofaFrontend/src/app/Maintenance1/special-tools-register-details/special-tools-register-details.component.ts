import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { SpecialToolsRegisterService } from '../services/special-tools-register.service';
import { SpecialToolsRegister } from '../Models/special-tools-register';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-special-tools-register-details',
  templateUrl: './special-tools-register-details.component.html',
  imports: [
  CommonModule,
  FormsModule,
  ReactiveFormsModule // if needed
],
  styleUrls: ['./special-tools-register-details.component.css'],
  standalone: true,
  providers: [SpecialToolsRegisterService]
})
export class SpecialToolsRegisterDetailsComponent implements OnInit {
  tool: SpecialToolsRegister | null = null; // Holds the tool details
  toolId?: number;

  constructor(
    private route: ActivatedRoute,
    private specialToolsRegisterService: SpecialToolsRegisterService
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe((params) => {
      this.toolId = +params['id']; // Extract the ID from the route
      if (this.toolId) {
        this.loadToolDetails(this.toolId);
      }
    });
  }

  loadToolDetails(id: number): void {
    this.specialToolsRegisterService.getSpecialToolsRegisterById(id).subscribe(
      (data) => {
        this.tool = data; // Assign the fetched data to the tool property
      },
      (error) => {
        console.error('Error loading special tool details:', error);
      }
    );
  }
}