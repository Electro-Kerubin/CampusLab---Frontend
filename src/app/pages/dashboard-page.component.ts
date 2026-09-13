import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { DataService } from '../services/data.service';
import {
  LucideAngularModule,
  TrendingUp,
  AlertCircle,
  MoreHorizontal,
  RefreshCw,
  Plus,
} from 'lucide-angular';
import { BaseChartDirective } from 'ng2-charts';
import {
  ChartConfiguration,
  ChartOptions,
  ChartType,
} from 'chart.js';

@Component({
  selector: 'app-dashboard-page',
  standalone: true,
  imports: [
    CommonModule,
    BaseChartDirective,
    LucideAngularModule,
  ],
  template: `
    <div class="p-6 space-y-6">
      <!-- Header row -->
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-xl font-bold text-gray-900">Dashboard</h1>
          <p class="text-sm text-gray-500 mt-0.5">Panel de operaciones · actualizado hace 30 seg</p>
        </div>
        <button
          (click)="goNewReservation()"
          class="flex items-center gap-2 bg-[#5cb85c] hover:bg-[#449d44] text-white rounded-lg px-4 py-2 text-sm font-semibold transition-colors shadow-sm"
        >
          <lucide-icon [img]="Plus" size="16" />
          Nueva Reserva
        </button>
      </div>

      <!-- KPI Cards -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <!-- Reservas Activas -->
        <div class="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <div class="flex items-start justify-between mb-3">
            <div>
              <p class="text-xs font-semibold text-gray-500 uppercase tracking-wider">Reservas Activas</p>
              <p class="text-3xl font-bold text-gray-900 mt-1">{{ data.activeBookingsCount() }}</p>
            </div>
            <div class="w-9 h-9 rounded-lg bg-green-50 flex items-center justify-center">
              <lucide-icon [img]="TrendingUp" size="18" class="text-[#5cb85c]" />
            </div>
          </div>
          <div class="flex items-center gap-1.5">
            <span class="text-xs font-semibold text-[#5cb85c] bg-green-50 px-2 py-0.5 rounded-full">+5%</span>
            <span class="text-xs text-gray-400">vs. semana anterior</span>
          </div>
        </div>

        <!-- Ocupación -->
        <div class="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <div class="flex items-start justify-between mb-2">
            <div>
              <p class="text-xs font-semibold text-gray-500 uppercase tracking-wider">Ocupación de Equipos</p>
              <p class="text-3xl font-bold text-gray-900 mt-1">{{ data.equipmentOccupancy().pct }}%</p>
              <p class="text-xs text-gray-400 mt-1">{{ data.equipmentOccupancy().inUse }} en uso</p>
            </div>
            <div class="relative w-[90px] h-[90px]">
              <svg width="90" height="90" class="-rotate-90">
                <circle cx="45" cy="45" r="36" fill="none" stroke="#e5e7eb" stroke-width="8" />
                <circle
                  cx="45" cy="45" r="36" fill="none" stroke="#5cb85c" stroke-width="8"
                  [attr.stroke-dasharray]="circleCirc"
                  [attr.stroke-dashoffset]="circleOffset()"
                  stroke-linecap="round"
                />
              </svg>
              <span class="absolute inset-0 flex items-center justify-center text-xs font-bold text-[#5cb85c]">{{ data.equipmentOccupancy().pct }}%</span>
            </div>
          </div>
        </div>

        <!-- Aprobaciones pendientes -->
        <div class="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <div class="flex items-start justify-between mb-3">
            <div>
              <p class="text-xs font-semibold text-gray-500 uppercase tracking-wider">Aprobaciones Pendientes</p>
              <p class="text-3xl font-bold text-gray-900 mt-1">{{ data.pendingApprovalsCount() }}</p>
            </div>
            <div class="w-9 h-9 rounded-lg bg-yellow-50 flex items-center justify-center">
              <lucide-icon [img]="AlertCircle" size="18" class="text-yellow-500" />
            </div>
          </div>
          <p class="text-xs text-gray-400">Reservas en estado SOLICITADA</p>
        </div>
      </div>

      <!-- Middle row -->
      <div class="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <!-- Workflow pipeline -->
        <div class="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <div class="flex items-center justify-between mb-4">
            <div>
              <h3 class="font-semibold text-gray-900 text-sm">Reservas: Estado y Flujo</h3>
              <p class="text-xs text-gray-400 mt-0.5">Estados actuales en transición</p>
            </div>
            <button class="text-gray-400 hover:text-gray-600">
              <lucide-icon [img]="MoreHorizontal" size="16" />
            </button>
          </div>

          <!-- Pipeline steps -->
          <div class="flex items-start gap-0 overflow-x-auto pb-2">
            @for (step of data.workflowSteps(); track step.id; let i = $index) {
              <div class="flex items-center">
                <div class="flex flex-col items-center min-w-[110px]">
                  <div
                    class="w-10 h-10 rounded-full border-2 flex items-center justify-center mb-2 transition-all"
                    [class]="stepCss(step)"
                  >
                    @if (step.done) {
                      <svg width="14" height="14" viewBox="0 0 14 14">
                        <path d="M11.5 3.5L5.5 9.5L2.5 6.5" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/>
                      </svg>
                    } @else {
                      <div class="w-2 h-2 rounded-full" [class]="step.active ? 'bg-white' : 'bg-gray-300'"></div>
                    }
                  </div>
                  <span class="text-[10px] font-bold text-center leading-tight px-1"
                        [class]="stepLabelCss(step)">{{ step.label }}</span>
                  <p class="text-[9px] text-gray-400 text-center mt-1 px-1 leading-tight line-clamp-2">{{ step.desc }}</p>
                </div>
                @if (i < data.workflowSteps().length - 1) {
                  <div class="h-0.5 w-6 mb-8 shrink-0" [class]="step.done ? 'bg-[#5cb85c]' : 'bg-gray-200'"></div>
                }
              </div>
            }
          </div>
        </div>

        <!-- Lab usage line chart -->
        <div class="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <div class="flex items-center justify-between mb-4">
            <div>
              <h3 class="font-semibold text-gray-900 text-sm">Uso de Laboratorios (Hoy)</h3>
              <p class="text-xs text-gray-400 mt-0.5">Actividad por hora</p>
            </div>
            <button class="text-gray-400 hover:text-gray-600">
              <lucide-icon [img]="MoreHorizontal" size="16" />
            </button>
          </div>
          <div style="height: 180px;">
            <canvas baseChart
                    [data]="labUsageChartData()"
                    [options]="labUsageChartOptions"
                    [type]="lineChartType">
            </canvas>
          </div>
        </div>
      </div>

      <!-- Bottom row: Equipment status bar chart -->
      <div class="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
        <div class="flex items-center justify-between mb-4 flex-wrap gap-3">
          <div>
            <h3 class="font-semibold text-gray-900 text-sm">Estado de Equipos — Tiempo Real</h3>
            <p class="text-xs text-gray-400 mt-0.5">Distribución de ocupación por tipo de equipo</p>
          </div>
          <div class="flex items-center gap-3">
            <div class="flex items-center gap-4 text-xs text-gray-500">
              <span class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-sm bg-[#5cb85c] inline-block"></span>Ocupado</span>
              <span class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-sm bg-[#a8d5a8] inline-block"></span>Disponible</span>
              <span class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-sm bg-[#fbbf24] inline-block"></span>Mantenimiento</span>
            </div>
            <button (click)="refresh()" class="text-gray-400 hover:text-gray-600 p-1 hover:bg-gray-100 rounded" title="Actualizar datos">
              <lucide-icon [img]="RefreshCw" size="14" />
            </button>
          </div>
        </div>
        <div style="height: 160px;">
          <canvas baseChart
                  [data]="equipmentChartData()"
                  [options]="equipmentChartOptions"
                  [type]="barChartType">
          </canvas>
        </div>
      </div>

      <!-- Microservices status row -->
      <div class="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
        <h3 class="font-semibold text-gray-900 text-sm mb-4">Estado de Microservicios</h3>
        <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          @for (svc of microservices; track svc.name) {
            <div class="border border-gray-100 rounded-lg p-3 bg-gray-50">
              <div class="flex items-center gap-1.5 mb-1">
                <div class="w-2 h-2 rounded-full animate-pulse"
                     [class]="svc.status === 'up' ? 'bg-[#5cb85c]' : 'bg-yellow-400'"></div>
                <span class="text-xs font-semibold text-gray-700">{{ svc.name }}</span>
              </div>
              <p class="text-[10px] text-gray-400 font-mono leading-tight">{{ svc.port }}</p>
            </div>
          }
        </div>
      </div>
    </div>
  `,
})
export class DashboardPageComponent {
  private dataService = inject(DataService);
  private router = inject(Router);

  readonly TrendingUp = TrendingUp;
  readonly AlertCircle = AlertCircle;
  readonly MoreHorizontal = MoreHorizontal;
  readonly RefreshCw = RefreshCw;
  readonly Plus = Plus;

  data = this.dataService;

  // Circle progress
  readonly circleCirc = 2 * Math.PI * 36;
  readonly circleOffset = computed(
    () => this.circleCirc - (this.data.equipmentOccupancy().pct / 100) * this.circleCirc
  );

  // Chart types
  readonly lineChartType: ChartType = 'line';
  readonly barChartType: ChartType = 'bar';

  // Lab usage line chart
  labUsageChartData = computed<ChartConfiguration['data']>(() => ({
    labels: this.data.usageByHour().map((d) => d.h),
    datasets: [
      {
        label: 'Uso de Labs',
        data: this.data.usageByHour().map((d) => d.labs),
        borderColor: '#5cb85c',
        backgroundColor: 'rgba(92,184,92,0.1)',
        borderWidth: 2,
        tension: 0.4,
        pointRadius: 0,
      },
      {
        label: 'Impresoras 3D',
        data: this.data.usageByHour().map((d) => d.impresoras),
        borderColor: '#f59e0b',
        backgroundColor: 'rgba(245,158,11,0.1)',
        borderWidth: 1.5,
        tension: 0.4,
        pointRadius: 0,
      },
      {
        label: 'Microscopios',
        data: this.data.usageByHour().map((d) => d.microscopios),
        borderColor: '#60a5fa',
        backgroundColor: 'rgba(96,165,250,0.1)',
        borderWidth: 1.5,
        tension: 0.4,
        pointRadius: 0,
      },
      {
        label: 'PCs Alta Gama',
        data: this.data.usageByHour().map((d) => d.pcs),
        borderColor: '#a78bfa',
        backgroundColor: 'rgba(167,139,250,0.1)',
        borderWidth: 1.5,
        tension: 0.4,
        pointRadius: 0,
      },
    ],
  }));

  labUsageChartOptions: ChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { labels: { font: { size: 10 } } },
      tooltip: { bodyFont: { size: 11 } },
    },
    scales: {
      x: { ticks: { font: { size: 10 }, color: '#9ca3af' }, grid: { color: '#f0f0f0' } },
      y: { ticks: { font: { size: 10 }, color: '#9ca3af' }, grid: { color: '#f0f0f0' } },
    },
  };

  // Equipment status bar chart
  equipmentChartData = computed<ChartConfiguration['data']>(() => ({
    labels: this.data.equipmentStatus().map((d) => d.name),
    datasets: [
      {
        label: 'Ocupado',
        data: this.data.equipmentStatus().map((d) => d.ocupado),
        backgroundColor: '#5cb85c',
        borderWidth: 0,
        stack: 'a',
      },
      {
        label: 'Disponible',
        data: this.data.equipmentStatus().map((d) => d.disponible),
        backgroundColor: '#a8d5a8',
        borderWidth: 0,
        stack: 'a',
      },
      {
        label: 'Mantenimiento',
        data: this.data.equipmentStatus().map((d) => d.mantenimiento),
        backgroundColor: '#fbbf24',
        borderWidth: 0,
        stack: 'a',
      },
    ],
  }));

  equipmentChartOptions: ChartOptions = {
    indexAxis: 'y',
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        bodyFont: { size: 11 },
        callbacks: { label: (c) => `${c.dataset.label}: ${c.raw}%` },
      },
    },
    scales: {
      x: {
        stacked: true,
        max: 100,
        ticks: { font: { size: 10 }, color: '#9ca3af', callback: (v) => `${v}%` },
        grid: { display: false },
      },
      y: {
        stacked: true,
        ticks: { font: { size: 11 }, color: '#6b7280' },
        grid: { color: '#f0f0f0' },
      },
    },
  };

  microservices = [
    { name: 'ms-bookings', port: '/api/bookings/*', status: 'up' },
    { name: 'ms-catalog', port: '/api/catalog/*', status: 'up' },
    { name: 'ms-notify', port: 'RabbitMQ consumer', status: 'up' },
    { name: 'ms-audit', port: '/api/audit/*', status: 'up' },
    { name: 'ms-report', port: '/api/report/*', status: 'warning' },
  ];

  stepCss(step: { active: boolean; done: boolean }): string {
    if (step.active) {
      return 'border-[#5cb85c] bg-[#5cb85c] text-white shadow-lg shadow-green-200';
    }
    if (step.done) {
      return 'border-[#5cb85c] bg-green-50 text-[#5cb85c]';
    }
    return 'border-gray-200 bg-white text-gray-300';
  }

  stepLabelCss(step: { active: boolean; done: boolean }): string {
    if (step.active) return 'text-[#5cb85c]';
    if (step.done) return 'text-gray-600';
    return 'text-gray-400';
  }

  refresh(): void {
    this.dataService.reloadAll();
  }

  goNewReservation(): void {
    this.router.navigate(['/bookings']);
  }
}
