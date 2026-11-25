import { TestBed } from '@angular/core/testing';
import { SecurityContext } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { of } from 'rxjs';
import { vi } from 'vitest';
import { POWER_BI_CONFIG } from '../../nucleo/configuracion-powerbi';
import { ConsultasApi, MedicosApi } from '../../servicios/servicio-operaciones-api';
import { Reports, validarUrlPublicaPowerBi } from './reportes';

// Enlace sintético para pruebas; no se duplica el enlace publicado del proyecto.
const URL_PRUEBA = 'https://app.powerbi.com/view?r=eyJrIjoiZmljdGljaW8ifQ';
const REPORTE = {
  total_citas: 4,
  citas_atendidas: 2,
  total_atenciones: 2,
  total_servicios: 3,
  total_movimientos: 5,
  insumos_por_reponer: 1,
  citas_por_medico: [{ id: '1', nombre: 'Médico de prueba', cantidad: 4, unidad: '' }],
  servicios: [{ id: '2', nombre: 'Servicio de prueba', cantidad: 3, unidad: '' }],
  consumos: [{ id: '3', nombre: 'Insumo de prueba', cantidad: 2, unidad: 'ml' }],
};

describe('Enlaces públicos de Power BI', () => {
  it('admite el formato HTTPS de publicación y conserva sus parámetros', () => {
    expect(validarUrlPublicaPowerBi(URL_PRUEBA)).toBe(URL_PRUEBA);
    expect(validarUrlPublicaPowerBi(`${URL_PRUEBA}&language=es`)).toBe(`${URL_PRUEBA}&language=es`);
  });

  it.each([
    '',
    'javascript:alert(1)',
    URL_PRUEBA.replace('https:', 'http:'),
    URL_PRUEBA.replace('app.powerbi.com', 'app.powerbi.com.ejemplo.test'),
    URL_PRUEBA.replace('app.powerbi.com', 'sub.app.powerbi.com'),
    URL_PRUEBA.replace('app.powerbi.com', 'app.powerbi.com:8443'),
    URL_PRUEBA.replace('app.powerbi.com', 'usuario@app.powerbi.com'),
    URL_PRUEBA.replace('/view', '/reportEmbed'),
    URL_PRUEBA.replace('/view', '/view/otra-ruta'),
    'https://app.powerbi.com/view',
    'https://app.powerbi.com/view?r=',
    'https://app.powerbi.com/view?r=%3Cscript%3E',
    `${URL_PRUEBA}&r=otro`,
    `${URL_PRUEBA}#otro`,
  ])('rechaza enlaces ajenos al formato permitido: %s', (url) => {
    expect(validarUrlPublicaPowerBi(url)).toBe('');
  });
});

describe('Reportes operativos y visor OLAP', () => {
  const configuracionOriginal = POWER_BI_CONFIG.reportUrl;

  beforeEach(() => {
    POWER_BI_CONFIG.reportUrl = URL_PRUEBA;
    TestBed.configureTestingModule({
      providers: [
        { provide: MedicosApi, useValue: { listar: () => of({ data: [] }) } },
        { provide: ConsultasApi, useValue: { reporte: () => of({ data: REPORTE }) } },
      ],
    });
  });

  afterEach(() => {
    TestBed.resetTestingModule();
    POWER_BI_CONFIG.reportUrl = configuracionOriginal;
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  function preparar() {
    const fixture = TestBed.createComponent(Reports);
    fixture.detectChanges();
    const root: HTMLElement = fixture.nativeElement;
    function pulsar(texto: string) {
      const boton = [...root.querySelectorAll('button')].find((b) =>
        b.textContent?.includes(texto),
      );
      expect(boton, texto).toBeTruthy();
      boton!.click();
      fixture.detectChanges();
    }
    return { fixture, root, page: fixture.componentInstance, pulsar };
  }

  it('navega por las cuatro opciones, conserva filtros y mantiene el mismo iframe al volver', () => {
    const { fixture, root, page, pulsar } = preparar();
    expect(root.querySelector('iframe')).toBeNull();
    page.from.set('2026-01-01');
    page.doctor.set('1');
    pulsar('Servicios hospitalarios');
    expect(page.bars()).toEqual(REPORTE.servicios);
    pulsar('Inventario');
    expect(page.bars()).toEqual(REPORTE.consumos);
    pulsar('Análisis OLAP');
    const iframe = root.querySelector('iframe')!;
    expect(iframe.getAttribute('src')).toBe(URL_PRUEBA);
    expect(iframe.title).toContain('Análisis OLAP');
    expect(iframe.hasAttribute('allowfullscreen')).toBe(true);
    expect(root.querySelector<HTMLElement>('#reportes-operativos')!.hidden).toBe(true);
    expect(root.textContent).toContain('exclusivamente datos ficticios');
    expect(root.textContent).toContain('Estado no verificado');
    expect(root.textContent).toContain('no fuerza la actualización del modelo semántico');
    pulsar('Citas y atenciones');
    expect(page.bars()).toEqual(REPORTE.citas_por_medico);
    expect(page.from()).toBe('2026-01-01');
    expect(page.doctor()).toBe('1');
    expect(root.querySelector<HTMLElement>('#analisis-olap')!.hidden).toBe(true);
    pulsar('Análisis OLAP');
    expect(root.querySelector('iframe')).toBe(iframe);
    iframe.dispatchEvent(new Event('load'));
    fixture.detectChanges();
    expect(page.estadoPowerBi()).toBe('documento-cargado');
    expect(root.querySelector('.loading-report')).toBeNull();
  });

  it('recarga solo el iframe sin repetir las consultas operativas ni cambiar la URL', () => {
    const consulta = vi.spyOn(TestBed.inject(ConsultasApi), 'reporte');
    const { root, pulsar } = preparar();
    pulsar('Análisis OLAP');
    const anterior = root.querySelector('iframe');
    pulsar('Recargar visualización');
    expect(root.querySelector('iframe')).not.toBe(anterior);
    expect(root.querySelector('iframe')!.getAttribute('src')).toBe(URL_PRUEBA);
    expect(consulta).toHaveBeenCalledTimes(1);
    const enlace = root.querySelector<HTMLAnchorElement>('.viewer-actions a')!;
    expect(enlace.href).toBe(URL_PRUEBA);
    expect(enlace.target).toBe('_blank');
    expect(enlace.rel).toContain('noopener');
  });

  it('no confía ni incrusta una URL inválida y conserva los reportes operativos', () => {
    POWER_BI_CONFIG.reportUrl = 'https://ejemplo.test/view?r=prueba';
    const confiar = vi.spyOn(TestBed.inject(DomSanitizer), 'bypassSecurityTrustResourceUrl');
    const { root, pulsar } = preparar();
    pulsar('Análisis OLAP');
    expect(confiar).not.toHaveBeenCalled();
    expect(root.querySelector('iframe')).toBeNull();
    expect(root.textContent).toContain('Informe no disponible');
    pulsar('Citas y atenciones');
    expect(root.querySelector<HTMLElement>('#reportes-operativos')!.hidden).toBe(false);
  });

  it('marca como confiable únicamente la URL validada para el contexto de recursos', () => {
    const { page } = preparar();
    const sanitizer = TestBed.inject(DomSanitizer);
    expect(sanitizer.sanitize(SecurityContext.RESOURCE_URL, page.powerBiSrc)).toBe(URL_PRUEBA);
  });

  it('muestra ayuda tras una demora, permite recuperarse y limpia el temporizador al salir', () => {
    vi.useFakeTimers();
    const { fixture, page, root, pulsar } = preparar();
    pulsar('Análisis OLAP');
    expect(page.estadoPowerBi()).toBe('cargando');
    vi.advanceTimersByTime(25000);
    fixture.detectChanges();
    expect(root.textContent).toContain('tardando más de lo esperado');
    root.querySelector('iframe')!.dispatchEvent(new Event('load'));
    expect(page.estadoPowerBi()).toBe('documento-cargado');
    pulsar('Recargar visualización');
    root.querySelector('iframe')!.dispatchEvent(new Event('error'));
    fixture.detectChanges();
    expect(root.textContent).toContain('No se pudo cargar la visualización');
    pulsar('Recargar visualización');
    fixture.destroy();
    vi.advanceTimersByTime(25000);
    expect(page.estadoPowerBi()).toBe('cargando');
  });

  it('solicita y abandona pantalla completa, y maneja el rechazo del navegador', async () => {
    const { root, page, pulsar } = preparar();
    pulsar('Análisis OLAP');
    const visor = root.querySelector<HTMLElement>('.olap-viewer')!;
    const solicitar = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(visor, 'requestFullscreen', { configurable: true, value: solicitar });
    await page.alternarPantallaCompleta(visor);
    expect(solicitar).toHaveBeenCalledTimes(1);
    Object.defineProperty(document, 'fullscreenElement', { configurable: true, value: visor });
    document.dispatchEvent(new Event('fullscreenchange'));
    expect(page.pantallaCompleta()).toBe(true);
    const salir = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(document, 'exitFullscreen', { configurable: true, value: salir });
    await page.alternarPantallaCompleta(visor);
    expect(salir).toHaveBeenCalledTimes(1);
    Object.defineProperty(document, 'fullscreenElement', { configurable: true, value: null });
    document.dispatchEvent(new Event('fullscreenchange'));
    expect(page.pantallaCompleta()).toBe(false);
    solicitar.mockRejectedValue(new Error('No permitido'));
    await page.alternarPantallaCompleta(visor);
    expect(page.errorPantallaCompleta()).toContain('No se pudo');
    Reflect.deleteProperty(document, 'fullscreenElement');
    Reflect.deleteProperty(document, 'exitFullscreen');
  });
});
