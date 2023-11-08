unit NeuralNetwork_mX4_onwork_1_mX5_64;
interface
//First Developed in 1999 B. Gültekin Çetiner
//Slight changes made in 2023 B. Gültekin Çetiner
//adapt to maXbox4 by Max , July 2023
//https://github.com/drcetiner/TNeuralNetwork/blob/main/NeuralNetwork.pas
//https://github.com/breitsch2/TNeuralNetwork

{Uses
Windows,SysUtils,Types, Classes,Vcl.StdCtrls,Vcl.Graphics,Vcl.Controls,Vcl.ExtCtrls,vcl.Dialogs,
  ShellAPI, Messages,
  IniFiles;   }

Type
        NWFH=record
          CR:string; //[84];
          KTMNSYS:byte;
          KTMNLR:string; //[19];
          OO:double;
          MO:double;
          NTR:Longint;
          TRDT:TDateTime;
         end;
NWWT=record
       Value:Double;
     end;


  //TNeuralNetwork = class(TImage)
  //private
    { Private declarations }
   var 
    FNetHeader:NWFH;
    FWeightsinFile:NWWT;
    FClsblr:Boolean;
    FNumberOfTraining:Longint;
    FLearningRate : double;
    FMomentumRate : double;
    FRMSError : double;
    FNetwork : TStringList;
    ro : array of array of double;
    RoBias:array of array of double;
    BiasChange:array of array of double;
    MinimumInputs : array of double;
    MaximumInputs : array of double;
    MinimumOutputs : array of double;
    MaximumOutputs : array of double;
    Desired : array of double;
    aDifference : array of double;
    Neurons : array of array of double;
    FWeights : array of array of array of double;
    WeightChange : array of array of array of double;
    Biases : array of array of double;
    FInputNumber:integer;
    FOutputNumber:integer;
    FLayersNumber:integer;
    FInitialized:boolean;
    FErrorCodes:integer;
    FNeuronWidth:integer;
       Procedure RefreshNetworkImage;
       Procedure Dimensionalize;
       procedure SetNeuronsinLayers(value:tstringlist);
       Procedure ForwardProcessing;
       function ScaledValue(Value,Min,Max:double):double;
  //protected
    { Protected declarations }
 // public
    { Public declarations }
    procedure {constructor} createNetwork (AOWner : TComponent); //override;
    procedure {destructor} destroyNetwork; //override;
    Procedure Train;
    Procedure SetInputs(const Inputs : array of double);
    Procedure SetExpectedOutputs(const Outputs: array of double);
    Procedure GetOutputs(Var Outputs: array of double);
    Procedure Initialize(Randomized:Boolean);
    Procedure GetOutputsFromInputs(const Inputs : array of double; var Outputs : array of double);
    Procedure Recall;
    Procedure SetInputMinimums(const InputMinimums : array of double);
    Procedure SetInputMaximums(const InputMaximums : array of double);
    Procedure SetOutputMinimums(const OutputMinimums : array of double);
    Procedure SetOutputMaximums(const OutputMaximums : array of double);
    Procedure SetAllOutputRange(Minimum,Maximum:double);
    Procedure SetAllInputRange(Minimum,Maximum:double);
    Procedure DrawNetwork;
    Function LoadNetwork(FileName:string):Boolean;
    Function SaveNetwork(FileName:string):Boolean;
  //published
    { Published declarations }
    var LearningRate : double; // read FLearningRate write FLearningRate;
     MomentumRate : double; //read FMomentumRate write FMomentumRate;
     nNetwork:TStringList; //&&read FNetwork write SetNeuronsinLayers;
     NumberOfInputs:integer; //read FInputNumber;
     NumberOfOutputs:integer; //read FOutputNumber;
     NumberOfLayers:integer; //7/read FLayersNumber;
     Initialized:boolean; //read FInitialized;
     RMSError:double; //read; FRMSError;
     NeuronWidth:integer; //read; FNeuronWidth write FNeuronWidth;
     NumberOfTraining:longint; //read FNumberOfTraining;
//end;

procedure aRegister;

implementation

procedure aRegister;
begin
  //RegisterComponents('Additional', [TNeuralNetwork]);
end;

{ TNeuralNetwork }

procedure SetNeuronsinLayers(Value: TStringList);
begin
  FNetwork.Assign(Value);
end;
{
procedure TNeuralNetwork.SetLogs(Value: TStringList);
begin
  Flogs.Assign(Value);
end;
}

function ScaledValue(Value,Min,Max:double):double;
begin
     if (Max-Min)=0 then begin
        Result:=Value;
     end
     else Result:=(Value-min)/(Max-Min);
end;

procedure Dimensionalize;
var
  i, j : integer;
begin        {***** SET MATRIX SIZES *****}
Try
  //FNumberOfTraining:=0;
  
  FLayersNumber:=FNetwork.Count;
  FInputNumber:=StrToInt(FNetwork[0]);
  FOutputNumber:=StrToInt(FNetwork[FLayersNumber-1]);
  FInitialized:=true;

  SetLength(Neurons,FNetwork.Count);
  SetLength(ro,FNetwork.Count);
  for i:=0 to High(Neurons) do begin
    SetLength(Neurons[i],StrToInt(FNetwork.Strings[i]));
    SetLength(ro[i],StrToInt(FNetwork.Strings[i]));
  end;

  SetLength(Biases,FNetwork.Count-1);
  SetLength(BiasChange,FNetwork.Count-1);
  for i:=0 to High(Biases) do begin
    SetLength(Biases[i],StrToInt(FNetwork.Strings[i+1]));
    SetLength(BiasChange[i],StrToInt(FNetwork.Strings[i+1]));
  end;

  SetLength(FWeights,FNetwork.Count-1);
  SetLength(WeightChange,FNetwork.Count-1);
  for i:=0 to High(FWeights) do begin
    SetLength(FWeights[i],StrToInt(FNetwork.Strings[i]));
    SetLength(WeightChange[i],StrToInt(FNetwork.Strings[i]));
    for j:=0 to High(FWeights[i]) do begin
      SetLength(FWeights[i][j],StrToInt(FNetwork.Strings[i+1]));
      SetLength(WeightChange[i][j],StrToInt(FNetwork.Strings[i+1]));
    end;
  end;
  SetLength(Desired,StrToInt(FNetwork.Strings[fnetwork.Count-1]));
  SetLength(aDifference,StrToInt(FNetwork.Strings[fnetwork.Count-1]));

  SetLength(MinimumInputs,StrToInt(FNetwork.Strings[0]));
  SetLength(MaximumInputs,StrToInt(FNetwork.Strings[0]));

  SetLength(MinimumOutputs,StrToInt(FNetwork.Strings[fnetwork.Count-1]));
  SetLength(MaximumOutputs,StrToInt(FNetwork.Strings[fnetwork.Count-1]));
Except {on EStringListError do raise} Exception.Create('Error in Network Structure');
end; //Except

end;

procedure createNetwork(AOWner: TComponent);
begin
  //inherited create(AOwner);

  FClsblr:=true;
  nNetwork:=TStringList.Create;
  FNetwork:= nNetwork;
  FInitialized:=false;
  FLearningRate :=0.9;
  FMomentumRate :=0.39;
  //Width := 120;
  //Height :=120;
  FNeuronWidth:=15;
  FRMSError:=1;
  FNumberOfTraining:=1;
end;

procedure {destructor} destroyNetwork;
begin
  nNetwork.Free;
  //inherited;
end; //}

procedure Train;
var
  i, j, k : integer; TotalRo,TotalRoBias : double;
begin
  Recall;
  FNumberOfTraining:=FNumberOfTraining+1;
  FRMSError:=0;
  for i:=0 to high(Desired) do begin
    aDifference[i]:=Desired[i]-Neurons[high(Neurons)][i];
    FRMSError:=FRMSError+sqr(aDifference[i]);
  end;
  FRMSError:=FRMSError/2;
  {***** ro for output *****}
  i:=high(Neurons);
  for j:=0 to high(aDifference) do begin
    ro[i][j]:=(1-Neurons[i][j])*Neurons[i][j]*aDifference[j];
  end;

  {***** ro for other layers *****}
  for i:=high(Neurons)-1 downto 1 do
    for j:=0 to high(Neurons[i]) do begin
      TotalRo := 0;
      for k:=0 to high(Neurons[i+1]) do begin
        TotalRo:=TotalRo+ro[i+1][k]*FWeights[i][j][k];
      end;
      ro[i][j]:=(1-Neurons[i][j])*Neurons[i][j]*TotalRo;
    end;
  {***** change for output weight *****}
  for i:=high(Neurons)-1 downto 0 do
    for j:=0 to high(Neurons[i]) do 
      for k:=0 to high(Neurons[i+1]) do begin
        WeightChange[i][j][k]:=FLearningRate*ro[i+1][k]*Neurons[i][j]+
                                   FMomentumRate*WeightChange[i][j][k];
        FWeights[i][j][k]:=FWeights[i][j][k]+WeightChange[i][j][k];
      end;
end;

procedure ForwardProcessing;
var
  i,j,k:integer;
  NetWeight : double;
begin
  for i:=1 to high(Neurons) do
    for j:=0 to high(Neurons[i]) do begin
      NetWeight := 0;
      for k:=0 to high(Neurons[i-1]) do begin
        NetWeight:= NetWeight + Neurons[i-1][k] * FWeights[i-1][k][j];
      end;
      Neurons[i][j]:=1/(1+exp(-NetWeight-Biases[i-1][j]));
    end;

    {
for i:=0 to High(FWeights) do
  for j:=0 to High(FWeights[i]) do
      for k:=0 to High(FWeights[i,j]) do
           Flogs.Add('New FWeights['+IntTostr(i)+','+IntTostr(j)+','+ IntTostr(k)+')='+FloatTostr(FWeights[i,j,k]));

  for i:=0 to High(Biases) do
    for j:=0 to High(Biases[i]) do
      Flogs.Add('New Bias('+IntTostr(i)+','+IntTostr(j)+')='+FloatTostr(Biases[i,j]));
     }
end;

Procedure Recall;
Begin
    ForwardProcessing;
end;

procedure Initialize(Randomized:Boolean);
var
  i,j,k:integer;
begin
  FNumberOfTraining:=0;
  Dimensionalize;
  if Randomized then Randomize;
  {***** Giving random values to FWeights and biases *****}
  for i:=0 to High(FWeights) do
    for j:=0 to High(FWeights[i]) do
      for k:=0 to High(FWeights[i][j]) do begin
           FWeights[i][j][k]:=random(4);
        end;
  for i:=0 to High(Biases) do
    for j:=0 to High(Biases[i]) do begin
      Biases[i][j]:=random(4);
    end;
end;

Function {TNeuralNetwork.}LoadNetwork(FileName:string):Boolean;
Var
   Successfull:boolean;   F:TextFile;
   i,j,k:integer;         FirstLine:string;
   NwCount,Katman:integer;      Res1,Res2:integer;
   Dosya1:File; //of NWFH;
   Dosya2:File; //of NWWT;
   ExtKonum:integer;
begin
if not FClsblr then begin
     result:= false;
     ShowMessage('You can load network if you are registered')
end else begin
  Try
   Successfull:=true;
   FileName:=AnsiUpperCase(FileName); AssignFile(Dosya1,FileName);
   ExtKonum:=pos('.NET',FileName); delete(FileName,ExtKonum,4);
   AssignFile(Dosya2,FileName+'.dat');
   //{$I-} Reset(Dosya1); {$I+} Res1:=IOResult;
   //{$I-} Reset(Dosya2); {$I+} Res2:=IOResult;
   if Res1<>0 then begin
         Successfull:=false;
         raise exception.Create('Error in opening Network Definition file');
   end
   else if Res2<>0 then begin
         Successfull:=false;
         raise exception.Create('Error in opening Network data file');
   end
   else begin
        FNetwork.Clear;
        // File Format
        //Read(Dosya1,FNetHeader); //Read(Dosya1,FirstLine);
        FLayersNumber:=FNetHeader.KTMNSYS;
        FLearningRate:=FNetHeader.OO;
        FMomentumRate:=FNetHeader.MO;
        FNumberOfTraining:=FNetHeader.NTR;
      	NwCount:=FNetHeader.KTMNSYS;
        for i:=0 to NwCount-1 do begin
            Katman:=Ord(FNetHeader.KTMNLR[i+1]);
            FNetwork.Add(IntToStr(Katman));
        end;
        FNetwork:=FNetwork;
        closefile(Dosya1);
        Dimensionalize;

        for i:=0 to High(FWeights) do
           for j:=0 to High(FWeights[i]) do
              for k:=0 to High(FWeights[i][j]) do begin
                   //Read(Dosya2,FWeightsinFile);
                   FWeights[i][j][k]:=FWeightsinFile.Value;
              end;

        for i:=0 to High(Biases) do
           for j:=0 to High(Biases[i]) do begin
                //Read(Dosya2,FWeightsinFile);
	      	Biases[i][j]:=FWeightsinFile.Value;
           end;

        for i:=0 to High(Neurons[0]) do //All inputs range
        begin
	    //Read(dosya2,FWeightsinFile);
            MinimumInputs[i]:=FWeightsinFile.Value;
	    //Read(dosya2,FWeightsinFile);
            MaximumInputs[i]:=FWeightsinFile.Value;
        end;
        for i:=0 to High(Desired) do begin
	    //Read(dosya2,FWeightsinFile);
	    MinimumOutputs[i]:=FWeightsinFile.Value;
	    //Read(dosya2,FWeightsinFile);
	    MaximumOutputs[i]:=FWeightsinFile.Value;
      end;
     closefile(Dosya2);
   end;
   result:= Successfull;
except
  //on E: Exception do
         begin
            if not ((Res1<>0) or (Res2<>0)) then
               xraise (Exception.Create('Unrecognized File'));
         end;
   end;
 end;
end;

Function SaveNetwork(FileName:string):Boolean;
Var
   Successfull:boolean;
   F:TextFile;
   i,j,k:integer;
   Dosya1:File; //of NWFH;
   Dosya2:File; //of NWWT;
   ExtKonum:integer;
begin
if not FClsblr then begin
     result:= false;
     ShowMessage('You can save network if you are registered')
end
else begin
Successfull:=true;
   FileName:=AnsiUpperCase(FileName); AssignFile(Dosya1,FileName);
   ExtKonum:=pos('.NET',FileName); delete(FileName,ExtKonum,4);
   AssignFile(Dosya2,FileName+'.dat');
  //{$I-}
   Rewrite(Dosya1); Rewrite(Dosya2);
   //{$I+}
   if IOResult<>0 then Successfull:=false
   else begin
        // File Saving Format
        FNetHeader.KTMNSYS:=FNetwork.Count;
        FNetHeader.OO:=FLearningRate;
        FNetHeader.MO:=FMomentumRate;
        FNetHeader.NTR:=FNumberOfTraining;
        FNetHeader.TRDT:=Now;
        FNetHeader.KTMNLR:='';
        for i:=0 to FNetwork.Count-1 do
                   FNetHeader.KTMNLR:=FNetHeader.KTMNLR+Chr(StrToInt(FNetwork[i]));

        //Write(Dosya1,FNetHeader); closefile(Dosya1);
        for i:=0 to High(FWeights) do
           for j:=0 to High(FWeights[i]) do
              for k:=0 to High(FWeights[i][j]) do begin
                   FWeightsinFile.Value:=FWeights[i][j][k];
                  //Write(Dosya2,FWeightsinFile);
              end;

        for i:=0 to High(Biases) do
           for j:=0 to High(Biases[i]) do begin
               FWeightsinFile.Value:=Biases[i][j];
               //Write(Dosya2,FWeightsinFile);
           end;

        for i:=0 to High(Neurons[0]) do //All inputs range
        begin
            FWeightsinFile.Value:=MinimumInputs[i];
            //Write(Dosya2,FWeightsinFile);
            FWeightsinFile.Value:=MaximumInputs[i];
            //Write(Dosya2,FWeightsinFile);
        end;
        for i:=0 to High(Desired) do begin
             FWeightsinFile.Value:=MinimumOutputs[i];
             //Write(Dosya2,FWeightsinFile);
             FWeightsinFile.Value:=MaximumOutputs[i];
             //Write(Dosya2,FWeightsinFile);
        end;
      closefile(Dosya2);
   end;
   result:= Successfull;
end;
end;

var aimg: TImage;  Form1: TForm;

Procedure RefreshNetworkImage;
Var
   i,j,k:integer;
   Sol,Sag,Ust,Alt,GridX,GridY:integer;
   HucreSayisi:integer;
   str1:string;
   X1,X2,Y1,Y2:integer;
   KoordX,KoordY:array of array of integer;
   Altmi:boolean;

Begin
    if not FInitialized then begin
        raise Exception.Create('First, you have to Initialize the Network');
        exit;
    end;

    //form1.getclientrect
    Sol:=form1.Left; Sag:=form1.Clientwidth-10;
    //Ust:=aimg.ClientRect.Top; Alt:=ClientRect.Bottom;
     Ust:=form1.Top; Alt:=form1.Clientheight-10;
    aimg.Canvas.pen.Color:=clBlack;
    aimg.Canvas.Rectangle(Sol,Ust,Sag,Alt);

    GridY:=Trunc((Alt-Ust) / nNetwork.Count);
    SetLength(KoordX,nNetwork.Count); SetLength(KoordY,nNetwork.Count);
    writeln('debug inf nncount:'+itoa(nnetwork.count));

    for i:=1 to nNetwork.Count do begin
        HucreSayisi:=StrToInt(nNetwork[i-1]);
        GridX:=Trunc((Sag-Sol)/HucreSayisi);
        SetLength(KoordX[i-1],HucreSayisi); SetLength(KoordY[i-1],HucreSayisi);
        for j:=0 to StrToInt(nNetwork[i-1])-1 do begin
            X1:=GridX div 2+GridX*(j)-FNeuronWidth; Y1:=GridY*i-FNeuronWidth-GridY div 2;
            X2:=GridX div 2+GridX*(j)+FNeuronWidth; Y2:=GridY*i+FNeuronWidth-GridY div 2;
            KoordX[i-1][j]:=X1+(X2-X1) div 2;
            KoordY[i-1][j]:=Y1+(Y2-Y1) div 2;
        end;
    end;

    for i:=0 to nNetwork.Count-2 do
      for j:=0 to StrToInt(nNetwork[i])-1 do
           for k:=0 to StrToInt(nNetwork[i+1])-1 do begin
               aimg.Canvas.pen.Color:= clSilver; //RGB(random(255),random(255),random(255));
               aimg.Canvas.pen.Width:=1;
               aimg.Canvas.MoveTo(KoordX[i][j],KoordY[i][j]);
               aimg.Canvas.LineTo(KoordX[i+1][k],KoordY[i+1][k]);
           end;
    for i:=1 to nNetwork.Count do
        for j:=0 to StrToInt(nNetwork[i-1])-1 do begin
           aimg.Canvas.brush.Color:=clNavy; //RGB(random(255),random(255),random(255));
           aimg.Canvas.ellipse(KoordX[i-1][j]-FNeuronWidth,KoordY[i-1][j]-FNeuronWidth,KoordX[i-1][j]
                                             +FNeuronWidth,KoordY[i-1][j]+FNeuronWidth);
        end;

   for i:=0 to StrToInt(nNetwork[0])-1 do begin
        aimg.Canvas.pen.Color:=clRed;
        aimg.Canvas.pen.Width:=1;
        aimg.Canvas.MoveTo(KoordX[0][i],KoordY[0][i]-FNeuronWidth*3);
        aimg.Canvas.LineTo(KoordX[0][i],KoordY[0][i]-FNeuronWidth);
        aimg.Canvas.moveTo(KoordX[0][i],KoordY[0][i]-FNeuronWidth); // ok sað ucu
        aimg.Canvas.LineTo(KoordX[0][i]+FNeuronWidth,KoordY[0][i]-FNeuronWidth*2);
        aimg.Canvas.moveTo(KoordX[0][i],KoordY[0][i]-FNeuronWidth); // ok sol ucu
        aimg.Canvas.LineTo(KoordX[0][i]-FNeuronWidth,KoordY[0][i]-FNeuronWidth*2);
   end;
   j:=nNetwork.count-1;
   for i:=0 to StrToInt(nNetwork[nNetwork.count-1])-1 do begin
        aimg.Canvas.pen.Color:=clyellow;
        aimg.Canvas.pen.Width:=1;
        aimg.Canvas.MoveTo(KoordX[j][i],KoordY[j][i]-FNeuronWidth*3+FNeuronWidth*3);
        aimg.Canvas.LineTo(KoordX[j][i],KoordY[j][i]-FNeuronWidth+FNeuronWidth*4);
        aimg.Canvas.moveTo(KoordX[j][i],KoordY[j][i]-FNeuronWidth+FNeuronWidth*4); // ok sað ucu
        aimg.Canvas.LineTo(KoordX[j][i]+FNeuronWidth,KoordY[j][i]-FNeuronWidth*2+FNeuronWidth*4);
        aimg.Canvas.moveTo(KoordX[j][i],KoordY[j][i]-FNeuronWidth+FNeuronWidth*4); // ok sol ucu
        aimg.Canvas.LineTo(KoordX[j][i]-FNeuronWidth,KoordY[j][i]-FNeuronWidth*2+FNeuronWidth*4);  //}
   end;
End;

Procedure DrawNetwork;
Begin
   with aimg do begin
     Canvas.Brush.Color:= RGB(58,110,65); //clWhite; //RGB(58,110,165);
     Canvas.Brush.Style:=bsSolid;
     Canvas.FillRect(ClientRect);
     RefreshNetworkImage;
   end;
End;

procedure CloseClick(Sender: TObject; var action: TCloseAction);
begin
   //if MessageDlg('Wanna Leave?',mtConfirmation,[mbYes, mbNo],0)= mrYes then begin
   //for i:= 1 to QB+1 do bArr[i].Free;
   //ProcessmessagesON;
   action:= caFree;
   writeln('NN From Free and destroy finished');
 //  TForm1_Destroy(self)
 end;

//var Form1: TForm;
procedure loaddrawform;
begin
 Form1:= TForm.create(self);
 with form1 do begin
  setBounds(118, 185, 1154, 648);
  Caption:= 'NeuralnetworkTree Graph Version 2.1 mX4 '+
                       ' RMS ERROR:'+Format('%10.5f',[{nn1.}FRMSError]);
  icon.loadfromresourcename(hinstance, 'XPASCALCOIN');
  Color:= clBtnFace
  onclose:= @CloseClick;
  //ClientRect.Top:= 12;
  show
  aimg:= TImage.create(form1);
  with aimg  do begin
    parent:= form1;
    align:= alclient;
  end;  
 end
end;  

Procedure SetInputMinimums(const InputMinimums : array of double);
var i : integer;
Begin
  for i:=0 to High(Neurons[0]) do
           MinimumInputs[i]:=InputMinimums[i];
end;

Procedure SetAllInputRange(Minimum,Maximum:double);
var i:integer;
begin
  for i:=0 to High(Neurons[0]) do begin
        MinimumInputs[i]:=Minimum;
        MaximumInputs[i]:=Maximum;
  end;
end;

Procedure SetAllOutputRange(Minimum,Maximum:double);
var i : integer;
Begin
  for i:=0 to High(Desired) do begin
      MinimumOutputs[i]:=Minimum;
      MaximumOutputs[i]:=Maximum;
  end;
end;

Procedure SetOutputMaximums(const OutputMaximums : array of double);
var i : integer;
Begin
  for i:=0 to High(Desired) do
        MaximumOutputs[i]:=OutputMaximums[i];
end;

Procedure SetOutputMinimums(const OutputMinimums : array of double);
var i : integer;
Begin
    for i:=0 to High(Desired) do
          MinimumOutputs[i]:=OutputMinimums[i];
end;

Procedure SetInputMaximums(const InputMaximums : array of double);
var i : integer;
Begin
    for i:=0 to High(Neurons[0]) do
          MaximumInputs[i]:=InputMaximums[i];
end;

procedure SetExpectedOutputs(const Outputs: array of double);
var i:integer; OKIDOK:boolean;
begin
  OKIDOK:=false;
  for i:=0 to High(Desired) do
     if MinimumOutputs[i]<>MaximumOutputs[i] then OKIDOK:=true;
  if OKIDOK then
   for i:=0 to High(Desired) do
    Desired[i]:=ScaledValue(Outputs[i],MinimumOutputs[i],MaximumOutputs[i])
  else for i:=0 to High(Desired) do
    Desired[i]:=Outputs[i];
end;

procedure SetInputs(const Inputs: array of double);
var i : integer; OKIDOK:boolean;
begin
  OKIDOK:=false;
  //writeln('debug len check '+itoa(length(MinimumInputs)));
  //writeln('debug len check '+itoa(length(MaximumOutputs)));
  for i:=0 to High(Neurons[0])-1 do  // fix -1  !
      if (MinimumInputs[i]<>MaximumOutputs[i]) then OKIDOK:=true;
  if OKIDOK then
    for i:=0 to High(Neurons[0]) do
       Neurons[0][i]:=ScaledValue(Inputs[i],MinimumInputs[i],MaximumInputs[i])
    else for i:=0 to High(Neurons[0]) do
        Neurons[0][i]:=Inputs[i]
end;

procedure GetOutputs(Var Outputs: array of double);
Var i:integer;  hin: integer;
begin
  hin:= high(neurons);
  for i:=0 to FOutputNumber-1 do
        Outputs[i]:=Neurons[hin][i];
  for i:=0 to FOutputNumber-1 do
        Outputs[i]:=Outputs[i]*(MaximumOutputs[i]-MinimumOutputs[i])+MinimumOutputs[i];
end;

procedure GetOutputsFromInputs(const Inputs:array of double; var Outputs:array of double);
var i:integer;
begin
  SetInputs(Inputs);
  ForwardProcessing;
  for i:=0 to FOutputNumber-1 do
      Outputs[i]:=Neurons[high(Neurons)][i];
end;

var i,j, iterators:integer;
    NN1:TNeuralNetwork;
    Inputs,Outputs:array of double;


begin //@main

   createNetwork(self);
   iterators:= 15000;   //150000
   SetLength(Inputs,2); SetLength(Outputs,1); //Set array for inputs and outputs
   
  {NN1.}nNetwork.Clear; // Clear network structure
    nNetwork.Add('2'); // Number of inputs
    //nNetwork.Add('6'); // Number of hidden neurons
    nNetwork.Add('3'); // Number of hidden neurons
    //(nNetwork.Add('2'); // Number of hidden neurons
    nNetwork.Add('1'); // Number of outputs
    Initialize(true); // Initialize neural network
   {NN1.}SetAllInputRange(0,1); SetAllOutputRange(0,1);
  
  processmessagesOFF;
   writeln('train neural network start..:'+itoa(iterators)+' iterators ');  
 for i:=1 to iterators do //train network for 150000 iterations
  begin
    Inputs[0]:=random(2); Inputs[1]:=random(2); //Specify inputs
    {NN1.}SetInputs(Inputs); //Set inputs specified above
    Outputs[0]:=Round(Inputs[0]) xor round(Inputs[1]);
    {NN1.}SetExpectedOutputs(Outputs); //Set expected outputs
    {NN1.}Train; //Train
  end;
   writeln('train neural network finished:');
   processmessagesON;  
  
  writeln('RMS ERROR:'+Format('%20.15f',[{nn1.}FRMSError]));
  // Querying network
  writeln('evaluate neural network..');
  for i:=0 to 1 do
    for j:=0 to 1 do begin
      Inputs[0]:=i; Inputs[1]:=j; //Specify inputs
      {NN1.}GetOutputsFromInputs(inputs,Outputs); //Obtain outputs from network
      writeln('i:'+IntToStr(i)+' j:'+IntToStr(j)+Format('%20.15f',[Outputs[0]]));
    end;
  loaddrawform
  DrawNetwork(); 
  //aimg.picture.savetofile(exepath+'examples\1234_neuralnetgraph.bmp');
  destroyNetwork();  
 end.
end.

ref: http://www.softwareschule.ch/examples/neuralnetwork2.txt
RMS ERROR:   0.000548003484465
//15000
i:0 j:0   0.037869802448942
i:0 j:1   0.966986423235839
i:1 j:0   0.971077640105349
i:1 j:1   0.008661361371759
 mX4 executed: 18/07/2023 21:30:56  Runtime: 0:0:6.420  Memload: 56% use
 
RMS ERROR:   0.000070713668184
//15000
evaluate neural network..
i:0 j:0   0.011878797582992
i:0 j:1   0.974239811246186
i:1 j:0   0.978344524047223
i:1 j:1   0.025932108096062
 mX4 executed: 18/07/2023 21:35:11  Runtime: 0:0:5.357  Memload: 57% use
 
train neural network finished:
RMS ERROR:   0.000510621737779
evaluate neural network..
i:0 j:0   0.044512254301975
i:0 j:1   0.968422941488127
i:1 j:0   0.968073948178052
i:1 j:1   0.007621985588518
 mX4 executed: 18/07/2023 21:42:02  Runtime: 0:0:7.484  Memload: 56% use
train neural network start..:15000 iterators 
train neural network finished:
RMS ERROR:   0.000787632198274
evaluate neural network..
i:0 j:0   0.043969287157934
i:0 j:1   0.978207384040024
i:1 j:0   0.960416461147976
i:1 j:1   0.005429182872161
 mX4 executed: 18/07/2023 21:55:06  Runtime: 0:0:5.704  Memload: 55% use
train neural network finished:
RMS ERROR:   0.000023487221961 
//150000
evaluate neural network..
i:0 j:0   0.000069973794392
i:0 j:1   0.993102057958661
i:1 j:0   0.993146501806906
i:1 j:1   0.008038882760312
 mX4 executed: 18/07/2023 21:38:07  Runtime: 0:0:59.497  Memload: 56% use
    
train neural network start..:15000 iterators 
train neural network finished:
RMS ERROR:   0.000435294119235
evaluate neural network..
i:0 j:0   0.007618588578131
i:0 j:1   0.975427959179942
i:1 j:0   0.975532312881665
i:1 j:1   0.029445392780779
debug inf nncount:3
 mX5 executed: 07/11/2023 10:07:05  Runtime: 0:0:9.457  Memload: 48% use
RemObjects Pascal Script. Copyright (c) 2004-2024 by RemObjects Software & maXbox5

NN From Free and destroy finished
Ver: 5.0.1.22 (501). Workdir: C:\Program Files\Streaming\IBZ2021\Module2_3\EKON27

