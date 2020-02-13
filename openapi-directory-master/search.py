import os
def search(path,data):
    if os.path.isdir(path):
        for child in os.listdir(path):
            search(os.path.join(path,child),data)
    elif "swagger" in path:
        lines = len(open(path).readlines())
        if lines>=1000:
            data.append(('https://github.com/APIs-guru/openapi-directory/blob/master/'+path,lines))
data = []
search("APIs",data)
print("\n".join(["{} {}".format(x,y) for x,y in sorted(data,key=lambda p:p[1],reverse=True)]))