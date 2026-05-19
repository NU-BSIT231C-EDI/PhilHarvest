<?php

require 'vendor/autoload.php';

$dotenv = \Dotenv\Dotenv::createImmutable(__DIR__);
$dotenv->load();

use Aws\Sqs\SqsClient;
use Aws\Exception\AwsException;

$client = new SqsClient([
    'version' => 'latest',
    'region'  => getenv('AWS_REGION'),
    'credentials' => [
        'key'    => getenv('AWS_ACCESS_KEY_ID'),
        'secret' => getenv('AWS_SECRET_ACCESS_KEY'),
    ]
]);

$queueUrl = getenv('SQS_PREFIX') . '/' . getenv('SQS_QUEUE');

echo "Queue URL: $queueUrl\n\n";

try {
    $result = $client->getQueueAttributes([
        'QueueUrl' => $queueUrl,
        'AttributeNames' => ['All']
    ]);
    
    echo "Queue Status:\n";
    echo "  Approximate Messages: " . $result['Attributes']['ApproximateNumberOfMessages'] . "\n";
    echo "  Approximate Messages Not Visible: " . $result['Attributes']['ApproximateNumberOfMessagesNotVisible'] . "\n";
    
    // Try to receive a message
    $messages = $client->receiveMessage([
        'QueueUrl' => $queueUrl,
        'MaxNumberOfMessages' => 1,
        'WaitTimeSeconds' => 5,
    ]);
    
    if (isset($messages['Messages'])) {
        echo "\nReceived message:\n";
        $msg = $messages['Messages'][0];
        echo "  MessageId: " . $msg['MessageId'] . "\n";
        echo "  Body preview: " . substr($msg['Body'], 0, 200) . "...\n";
    } else {
        echo "\nNo messages in queue\n";
    }
    
} catch (AwsException $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
