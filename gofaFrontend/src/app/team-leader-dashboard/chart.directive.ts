import { Directive, ElementRef, Input, OnChanges, OnDestroy, SimpleChanges } from '@angular/core';
import { Chart, ChartConfiguration, registerables } from 'chart.js';

// Register Chart.js components
Chart.register(...registerables);

@Directive({
  selector: '[appChart]'
})
export class ChartDirective implements OnChanges, OnDestroy {
  @Input() chartConfig: ChartConfiguration | null = null;
  private chart: Chart | null = null;

  constructor(private el: ElementRef<HTMLCanvasElement>) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['chartConfig'] && this.chartConfig) {
      this.renderChart();
    }
  }

  ngOnDestroy(): void {
    this.destroyChart();
  }

  private renderChart(): void {
    this.destroyChart();
    if (this.el.nativeElement && this.chartConfig) {
      this.chart = new Chart(this.el.nativeElement, this.chartConfig);
    } else {
      console.error('Canvas element or chart configuration not found');
    }
  }

  private destroyChart(): void {
    if (this.chart) {
      this.chart.destroy();
      this.chart = null;
    }
  }
}