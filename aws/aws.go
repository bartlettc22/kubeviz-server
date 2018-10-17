package aws

import (
  "fmt"
  "bytes"
  "github.com/aws/aws-sdk-go/aws"
  "github.com/aws/aws-sdk-go/aws/awserr"
  "github.com/aws/aws-sdk-go/aws/session"
  "github.com/aws/aws-sdk-go/service/s3"
  log "github.com/Sirupsen/logrus"
)

type Client struct {
  config *Config
	s3 *s3.S3
}

type Config struct {
  S3Bucket string
  S3Key string
}

func NewClient(c *Config) (*Client, error) {

  sess := session.Must(session.NewSession(&aws.Config{
     Region: aws.String("us-east-1"),
  }))

	client := &Client{
    config: c,
		s3: s3.New(sess),
	}

	return client, nil
}

func (c *Client) PostToS3(postData []byte, filename string) {

  fullKey := fmt.Sprintf("%v/%v", c.config.S3Key, filename)

  putObjectInput := s3.PutObjectInput{
    Bucket:      aws.String(c.config.S3Bucket),
    Key:         &fullKey,
    Body:        bytes.NewReader(postData),
    ContentType: aws.String("application/json"),
  }

  _, err := c.s3.PutObject(&putObjectInput)

  if err != nil {
    if aerr, ok := err.(awserr.Error); ok {
      log.Warn(aerr.Code())
    }
    log.Warn("Error uploading stats to S3; ", err)
    return
  }

  log.Info("Successfully posted data to s3: ", c.config.S3Bucket, "/", fullKey)
}
