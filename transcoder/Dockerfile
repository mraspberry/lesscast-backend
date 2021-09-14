FROM alpine:latest

RUN apk add --no-cache bash ffmpeg lame curl

COPY transcode.sh .

CMD ["./transcode.sh"]
