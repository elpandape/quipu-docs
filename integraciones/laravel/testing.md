# Testing

<Availability lite pro />

Para que tu app pruebe su integración con SUNAT **sin red ni certificado**, `Quipu::fake()` cambia el emisor por
dobles en memoria —al estilo de `Mail::fake()`— y expone aserciones:

```php
use ElPandaPe\QuipuLaravel\Facades\Quipu;

Quipu::fake();

// ... el código de tu app emite un comprobante ...
Quipu::emit($invoice);

Quipu::assertSent();                                        // se envió al menos uno
Quipu::assertSentCount(1);                                  // exactamente uno
Quipu::assertSent(fn ($signed) => str_contains($signed->xml, 'F001'));
Quipu::assertNothingSent();                                 // no se envió nada
```

Controla la respuesta simulada de SUNAT desde el handle que devuelve `fake()`:

```php
Quipu::fake()->acceptsEverything();          // aceptado (por defecto)
Quipu::fake()->rejectsEverything('2335');    // todo se rechaza con ese código
Quipu::fake()->observesEverything(['...']);  // aceptado con observaciones
```

Con la edición Pro instalada, `Quipu::fake()` **reutiliza el testing toolkit de Pro** (`FakeSender`,
`PayloadRecorder`, …) de forma transparente: tus tests son iguales con o sin Pro. Ver el
[testing toolkit de Pro](/pro/testing).

## Siguiente paso

- Vuelve a la [introducción de la integración](/integraciones/laravel) o repasa el [uso base](/integraciones/laravel/uso).
