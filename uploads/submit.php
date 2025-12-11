<?php
// 1. Setup Data
$comment = $_POST['user_comment'] ?? '';
$fileAttached = false;
$uploadDir = 'uploads/';

// 2. Handle File Upload
if (isset($_FILES['attachment_file']) && $_FILES['attachment_file']['error'] === UPLOAD_ERR_OK) {
    $fileName = time() . '_' . basename($_FILES['attachment_file']['name']);
    $targetPath = $uploadDir . $fileName;
    
    if (move_uploaded_file($_FILES['attachment_file']['tmp_name'], $targetPath)) {
        $fileAttached = $fileName;
    }
}

// 3. Save Data (Example: appending to a text file)
$logEntry = "Date: " . date('Y-m-d H:i:s') . "\n";
$logEntry .= "Comment: " . htmlspecialchars($comment) . "\n";
$logEntry .= "File: " . ($fileAttached ? $fileAttached : "None") . "\n";
$logEntry .= "----------------------------------\n";

file_put_contents('database.txt', $logEntry, FILE_APPEND);

// 4. Redirect to the final link
header("Location: https://t.me/onexgiveaway");
exit();
?>