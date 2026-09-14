import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DataService } from '../services/data.service';
import {
  LucideAngularModule,
  Clock,
  TrendingUp,
  Activity,
  Download,
} from 'lucide-angular';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartOptions, ChartType } from 'chart.js';

@Component({
  selector: 'app-reports-page',
  standalone: true,
  imports: [CommonModule, BaseChartDirective, LucideAngularModule],
  template: `
    <div class="p-6 space-y-6">
      <!-- Header -->
      <div class="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 class="text-xl font-bold text-gray-900">Reportería & Analítica</h1>
          <p class="text-sm text-gray-500 mt-0.5">ms-campuslab-report · Kafka streaming · /api/report/*</p>
        </div>
        <div class="flex items-center gap-2">
          <div class="flex bg-gray-100 rounded-lg p-1">
            @for (r of data.ranges; track r; let i = $index) {
              <button
                (click)="rangeIndex.set(i)"
                class="px-3 py-1.5 rounded-md text-xs font-medium transition-all"
                [class]="rangeIndex() === i ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'"
              >
                {{ r }}
              </button>
            }
          </div>
          <button class="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 transition-colors bg-white">
            <lucide-icon [img]="Download" size="14" /> Exportar
          </button>
        </div>
      </div>

      <!-- KPI Summary -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        @for (k of kpis(); track k.label) {
          <div class="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
            <div class="flex items-center justify-between mb-3">
              <div class="w-8 h-8 rounded-lg flex items-center justify-center" [class]="k.color">
                <lucide-icon [img]="k.icon" size="16" />
              </div>
              <span class="text-xs font-semibold text-[#5cb85c] bg-green-50 px-2 py-0.5 rounded-full">{{ k.delta }}</span>
            </div>
            <p class="text-2xl font-bold text-gray-900">{{ k.value }}</p>
            <p class="text-xs text-gray-500 mt-0.5">{{ k.label }}</p>
          </div>
        }
      </div>

      <!-- Charts grid -->
      <div class="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <!-- Reservas por hora -->
        <div class="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
          <h3 class="font-semibold text-gray-900 text-sm mb-4">Reservas por Hora</h3>
          <div style="height: 200px;">
            <canvas baseChart [data]="reservasChartData()" [options]="reservasChartOptions" [type]="lineChartType"></canvas>
          </div>
        </div>

        <!-- Tiempo de ciclo -->
        <div class="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
          <div class="flex items-center justify-between mb-4">
            <h3 class="font-semibold text-gray-900 text-sm">Tiempo de Ciclo (horas)</h3>
            <span class="text-xs text-gray-400 bg-gray-50 px-2 py-1 rounded font-mono">SOLICITADA → DEVUELTA</span>
          </div>
          <div style="height: 200px;">
            <canvas baseChart [data]="cicloChartData()" [options]="cicloChartOptions" [type]="barChartType"></canvas>
          </div>
        </div>
      </div>

      <!-- Bottom row -->
      <div class="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <!-- Top recursos -->
        <div class="xl:col-span-2 bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
          <h3 class="font-semibold text-gray-900 text-sm mb-4">Recursos Más Usados (últimos 7 días)</h3>
          <div class="space-y-3">
            @for (r of data.topResources(); track r.name; let i = $index) {
              <div class="flex items-center gap-3">
                <span class="text-xs font-bold text-gray-400 w-4 text-right">{{ i + 1 }}</span>
                <div class="flex-1">
                  <div class="flex justify-between text-xs mb-1">
                    <span class="text-gray-700 font-medium">{{ r.name }}</span>
                    <span class="text-gray-500 font-semibold">{{ r.usos }} usos</span>
                  </div>
                  <div class="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div class="h-full rounded-full"
                         [style.width.%]="(r.usos / maxTopUsos()) * 100"
                         [style.background]="topResourceColor(i)">
                    </div>
                  </div>
                </div>
              </div>
            }
          </div>
        </div>

        <!-- Distribución estados -->
        <div class="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
          <h3 class="font-semibold text-gray-900 text-sm mb-4">Distribución de Estados</h3>
          <div style="height: 160px;">
            <canvas baseChart [data]="estadosChartData()" [options]="estadosChartOptions" [type]="doughnutChartType"></canvas>
          </div>
          <div class="space-y-1.5 mt-2">
            @for (e of data.statusDistribution(); track e.name) {
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <div class="w-2.5 h-2.5 rounded-full" [style.background]="e.color"></div>
                  <span class="text-xs text-gray-600">{{ e.name }}</span>
                </div>
                <span class="text-xs font-semibold text-gray-700">{{ e.value }}</span>
              </div>
            }
          </div>
        </div>
      </div>

      <p class="text-xs text-gray-400 font-mono">GET /api/report/kpis?range=last24h · GET /api/report/top-resources?range=last7d · Kafka topic: bookings.events</p>
    </div>
  `,
})
export class ReportsPageComponent {
  private dataService = inject(DataService);

  readonly Clock = Clock;
  readonly TrendingUp = TrendingUp;
  readonly Activity = Activity;
  readonly Download = Download;

  data = this.dataService;
  rangeIndex = signal(0);

  readonly lineChartType: ChartType = 'line';
  readonly barChartType: ChartType = 'bar';
  readonly doughnutChartType: ChartType = 'doughnut';

  kpis = computed(() => {
    const k = this.dataService.reportKpis();
    return [
      { label: 'Total Reservas', value: `${k.totalReservas}`, delta: '+12%', icon: Activity, color: 'bg-green-50 text-[#5cb85c]' },
      { label: 'Tasa Aprobación', value: `${k.tasaAprobacion}%`, delta: '+3%', icon: TrendingUp, color: 'bg-blue-50 text-blue-600' },
      { label: 'Tiempo de Ciclo Prom.', value: `${k.tiempoCicloPromedio}h`, delta: '-0.6h', icon: Clock, color: 'bg-yellow-50 text-yellow-600' },
      { label: 'Tasa de Cancelación', value: `${k.tasaCancelacion}%`, delta: '-1.2%', icon: Activity, color: 'bg-purple-50 text-purple-600' },
    ];
  });

  maxTopUsos = computed(() => this.dataService.topResources()[0]?.usos ?? 1);

  // Reservas por hora
  reservasChartData = computed<ChartConfiguration['data']>(() => ({
    labels: this.dataService.bookingsByHour().map((d) => d.h),
    datasets: [
      {
        label: 'Reservas',
        data: this.dataService.bookingsByHour().map((d) => d.reservas),
        borderColor: '#5cb85c',
        backgroundColor: 'rgba(92,184,92,0.1)',
        borderWidth: 2,
        tension: 0.4,
        pointRadius: 3,
        pointBackgroundColor: '#5cb85c',
      },
      {
        label: 'Canceladas',
        data: this.dataService.bookingsByHour().map((d) => d.canceladas),
        borderColor: '#f87171',
        backgroundColor: 'rgba(248,113,113,0.1)',
        borderWidth: 1.5,
        tension: 0.4,
        pointRadius: 2,
        pointBackgroundColor: '#f87171',
      },
    ],
  }));

  reservasChartOptions: ChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { labels: { font: { size: 11 } } },
      tooltip: { bodyFont: { size: 11 } },
    },
    scales: {
      x: { ticks: { font: { size: 10 }, color: '#9ca3af' }, grid: { color: '#f0f0f0' } },
      y: { ticks: { font: { size: 10 }, color: '#9ca3af' }, grid: { color: '#f0f0f0' } },
    },
  };

  // Ciclo
  cicloChartData = computed<ChartConfiguration['data']>(() => ({
    labels: this.dataService.cycleTime().map((d) => d.semana),
    datasets: [
      {
        label: 'Ciclo (h)',
        data: this.dataService.cycleTime().map((d) => d.ciclo),
        backgroundColor: '#60a5fa',
        borderRadius: 4,
      },
    ],
  }));

  cicloChartOptions: ChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        bodyFont: { size: 11 },
        callbacks: { label: (c) => `${c.raw}h` },
      },
    },
    scales: {
      x: { ticks: { font: { size: 10 }, color: '#9ca3af' }, grid: { color: '#f0f0f0' } },
      y: {
        ticks: { font: { size: 10 }, color: '#9ca3af', callback: (v) => `${v}h` },
        grid: { color: '#f0f0f0' },
      },
    },
  };

  // Distribución estados (donut)
  estadosChartData = computed<ChartConfiguration['data']>(() => ({
    labels: this.dataService.statusDistribution().map((e) => e.name),
    datasets: [
      {
        data: this.dataService.statusDistribution().map((e) => e.value),
        backgroundColor: this.dataService.statusDistribution().map((e) => e.color),
        borderColor: '#fff',
        borderWidth: 2,
        // @ts-ignore - cutout is valid for doughnut datasets in Chart.js 4
        cutout: '55%',
      },
    ],
  }));

  estadosChartOptions: ChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: { bodyFont: { size: 11 } },
    },
  };

  topResourceColor(i: number): string {
    return `hsl(${132 - i * 12}, 55%, ${55 - i * 3}%)`;
  }
}
