#/bin/bash

GOOS=linux GOARCH=amd64 go build -o myapp
sftp -i ~/.ssh/droplet root@147.182.244.225 <<< 'put myapp sprt-dev'

echo "sudo systemctl restart sprt-dev.service && echo 'Done!'" | ssh -i ~/.ssh/droplet root@147.182.244.225 'bash -s'
