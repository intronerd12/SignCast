from inference_sdk import InferenceHTTPClient

client = InferenceHTTPClient(
    api_url="https://serverless.roboflow.com",
    api_key="vSmtDSumhDVW5oZg72Ef"
)

try:
    result = client.run_workflow(
        workspace_name="ianzaes-workspace",
        workflow_id="filipino-sign-language-dataset-vfilipino-sign-language-dataset-h0guf-1-yolo11n-t1-logic",
        images={
            "image": "https://upload.wikimedia.org/wikipedia/commons/1/15/Cat_August_2010-4.jpg"
        },
        use_cache=True
    )
    print("Success:")
    print(result)
except Exception as e:
    print("Error:")
    print(e)
