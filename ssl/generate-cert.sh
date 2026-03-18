#!/bin/sh
# Genera un certificado TLS autofirmado válido por 5 años.
# Útil para despliegues en LAN donde no se puede usar Let's Encrypt.
#
# Uso:
#   cd ssl
#   sh generate-cert.sh
#
# Los navegadores mostrarán una advertencia de seguridad al tratarse de un
# certificado autofirmado. Puedes importar cert.pem como CA de confianza
# en cada equipo cliente para eliminar la advertencia.

set -e

DAYS=1825  # 5 años
DIR="$(cd "$(dirname "$0")" && pwd)"

openssl req -x509 -nodes -newkey rsa:2048 \
  -keyout "$DIR/key.pem" \
  -out    "$DIR/cert.pem" \
  -days   "$DAYS" \
  -subj   "/C=DO/ST=Distrito Nacional/L=Santo Domingo/O=UASD/CN=uasd-despacho" \
  -addext "subjectAltName=IP:10.2.20.3,IP:127.0.0.1,DNS:localhost"

echo ""
echo "Certificado generado:"
echo "  Clave:        $DIR/key.pem"
echo "  Certificado:  $DIR/cert.pem"
echo ""
echo "Valido por $DAYS dias."
echo "Para confiar en él en Windows: importa cert.pem en 'Entidades de certificación raíz de confianza'."
