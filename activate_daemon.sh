#!/bin/bash
echo "$1" | sudo -S cp ~/aegis-os/aegis-scout.service /etc/systemd/system/
echo "$1" | sudo -S systemctl daemon-reload
echo "$1" | sudo -S systemctl enable aegis-scout
echo "$1" | sudo -S systemctl start aegis-scout
